import aiosqlite
import json
import os
from datetime import datetime
from typing import Optional, Dict
import logging
from contextlib import asynccontextmanager
import sqlite3
import uuid
try:
    from .schema_validator import SchemaValidator
except ImportError:
    # Handle case when running as script directly
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from schema_validator import SchemaValidator

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.getenv('DATABASE_PATH', 'meeting_minutes.db')
        self.db_path = db_path
        self.schema_validator = SchemaValidator(self.db_path)
        self._init_db()

    def _init_db(self):
        """Initialize the database with legacy approach"""
        try:
            # Run legacy initialization (handles all table creation)
            logger.info("Initializing database tables...")
            self._legacy_init_db()
            
            # Validate schema integrity
            logger.info("Validating schema integrity...")
            self.schema_validator.validate_schema()
            
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            raise



    def _legacy_init_db(self):
        """Legacy database initialization (for backward compatibility)"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Create meetings table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS meetings (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    folder_path TEXT
                )
            """)

            # Migration: Add folder_path column to existing meetings table
            try:
                cursor.execute("ALTER TABLE meetings ADD COLUMN folder_path TEXT")
                logger.info("Added folder_path column to meetings table")
            except sqlite3.OperationalError:
                pass  # Column already exists

            # Migration: ownership + status columns for the shared-backend MVP
            for col_name, col_def in [
                ("owner_id", "TEXT"),
                ("status", "TEXT"),
                ("source", "TEXT"),
                ("started_at", "TEXT"),
                ("duration_s", "INTEGER"),
                ("audio_uploaded", "INTEGER DEFAULT 0"),
                # A meeting belongs to at most one project; NULL == unassigned (triage).
                ("project_id", "TEXT"),
            ]:
                try:
                    cursor.execute(f"ALTER TABLE meetings ADD COLUMN {col_name} {col_def}")
                    logger.info(f"Added {col_name} column to meetings table")
                except sqlite3.OperationalError:
                    pass  # Column already exists
            
            # Create transcripts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transcripts (
                    id TEXT PRIMARY KEY,
                    meeting_id TEXT NOT NULL,
                    transcript TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    summary TEXT,
                    action_items TEXT,
                    key_points TEXT,
                    audio_start_time REAL,
                    audio_end_time REAL,
                    duration REAL,
                    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
                )
            """)

            # Add new columns to existing transcripts table (migration for old databases)
            try:
                cursor.execute("ALTER TABLE transcripts ADD COLUMN audio_start_time REAL")
            except sqlite3.OperationalError:
                pass  # Column already exists
            try:
                cursor.execute("ALTER TABLE transcripts ADD COLUMN audio_end_time REAL")
            except sqlite3.OperationalError:
                pass  # Column already exists
            try:
                cursor.execute("ALTER TABLE transcripts ADD COLUMN duration REAL")
            except sqlite3.OperationalError:
                pass  # Column already exists
            
            # Create summary_processes table (keeping existing functionality)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS summary_processes (
                    meeting_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    error TEXT,
                    result TEXT,
                    start_time TEXT,
                    end_time TEXT,
                    chunk_count INTEGER DEFAULT 0,
                    processing_time REAL DEFAULT 0.0,
                    metadata TEXT,
                    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transcript_chunks (
                    meeting_id TEXT PRIMARY KEY,
                    meeting_name TEXT,
                    transcript_text TEXT NOT NULL,
                    model TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    chunk_size INTEGER,
                    overlap INTEGER,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
                )
            """)

            # Create settings table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    whisperModel TEXT NOT NULL,
                    groqApiKey TEXT,
                    openaiApiKey TEXT,
                    anthropicApiKey TEXT,
                    ollamaApiKey TEXT
                )
            """)

            # Create transcript_settings table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transcript_settings (
                    id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    whisperApiKey TEXT,
                    deepgramApiKey TEXT,
                    elevenLabsApiKey TEXT,
                    groqApiKey TEXT,
                    openaiApiKey TEXT
                )
            """)

            # Create users table (internal-org auth via Google sign-in)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    google_sub TEXT UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    name TEXT,
                    picture TEXT,
                    is_admin INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    last_login_at TEXT
                )
            """)

            # Create projects table (a meeting series lives under one project)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    owner_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            # Create share_grants table (who can access a meeting)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS share_grants (
                    id TEXT PRIMARY KEY,
                    meeting_id TEXT NOT NULL,
                    grantee_id TEXT,
                    all_org INTEGER NOT NULL DEFAULT 0,
                    role TEXT NOT NULL DEFAULT 'viewer',
                    created_by TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
                )
            """)

            conn.commit()

    @asynccontextmanager
    async def _get_connection(self):
        """Get a new database connection"""
        conn = await aiosqlite.connect(self.db_path)
        try:
            yield conn
        finally:
            await conn.close()

    async def create_process(self, meeting_id: str) -> str:
        """Create a new process entry or update existing one and return its ID"""
        now = datetime.utcnow().isoformat()
        
        try:
            async with self._get_connection() as conn:
                # Begin transaction
                await conn.execute("BEGIN TRANSACTION")
                
                try:
                    # First try to update existing process
                    await conn.execute(
                        """
                        UPDATE summary_processes 
                        SET status = ?, updated_at = ?, start_time = ?, error = NULL, result = NULL
                        WHERE meeting_id = ?
                        """,
                        ("PENDING", now, now, meeting_id)
                    )
                    
                    # If no rows were updated, insert a new one
                    if conn.total_changes == 0:
                        await conn.execute(
                            "INSERT INTO summary_processes (meeting_id, status, created_at, updated_at, start_time) VALUES (?, ?, ?, ?, ?)",
                            (meeting_id, "PENDING", now, now, now)
                        )
                    
                    await conn.commit()
                    logger.info(f"Successfully created/updated process for meeting_id: {meeting_id}")
                    
                except Exception as e:
                    await conn.rollback()
                    logger.error(f"Failed to create process for meeting_id {meeting_id}: {str(e)}", exc_info=True)
                    raise
                    
        except Exception as e:
            logger.error(f"Database connection error in create_process: {str(e)}", exc_info=True)
            raise
        
        return meeting_id

    async def update_process(self, meeting_id: str, status: str, result: Optional[Dict] = None, error: Optional[str] = None, 
                           chunk_count: Optional[int] = None, processing_time: Optional[float] = None, 
                           metadata: Optional[Dict] = None):
        """Update a process status and result"""
        now = datetime.utcnow().isoformat()
        
        try:
            async with self._get_connection() as conn:
                # Begin transaction
                await conn.execute("BEGIN TRANSACTION")
                
                try:
                    update_fields = ["status = ?", "updated_at = ?"]
                    params = [status, now]
                    
                    if result:
                        # Validate result can be JSON serialized
                        try:
                            result_json = json.dumps(result)
                            update_fields.append("result = ?")
                            params.append(result_json)
                        except (TypeError, ValueError) as e:
                            logger.error(f"Failed to serialize result for meeting_id {meeting_id}: {str(e)}")
                            raise ValueError("Result data cannot be JSON serialized")
                            
                    if error:
                        # Sanitize error message to prevent log injection
                        sanitized_error = str(error).replace('\n', ' ').replace('\r', '')[:1000]
                        update_fields.append("error = ?")
                        params.append(sanitized_error)
                        
                    if chunk_count is not None:
                        update_fields.append("chunk_count = ?")
                        params.append(chunk_count)
                        
                    if processing_time is not None:
                        update_fields.append("processing_time = ?")
                        params.append(processing_time)
                        
                    if metadata:
                        # Validate metadata can be JSON serialized
                        try:
                            metadata_json = json.dumps(metadata)
                            update_fields.append("metadata = ?")
                            params.append(metadata_json)
                        except (TypeError, ValueError) as e:
                            logger.error(f"Failed to serialize metadata for meeting_id {meeting_id}: {str(e)}")
                            # Don't fail the whole operation for metadata serialization issues
                            
                    if status.upper() in ['COMPLETED', 'FAILED']:
                        update_fields.append("end_time = ?")
                        params.append(now)
                        
                    params.append(meeting_id)
                    query = f"UPDATE summary_processes SET {', '.join(update_fields)} WHERE meeting_id = ?"
                    
                    cursor = await conn.execute(query, params)
                    if cursor.rowcount == 0:
                        logger.warning(f"No process found to update for meeting_id: {meeting_id}")
                        
                    await conn.commit()
                    logger.debug(f"Successfully updated process status to {status} for meeting_id: {meeting_id}")
                    
                except Exception as e:
                    await conn.rollback()
                    logger.error(f"Failed to update process for meeting_id {meeting_id}: {str(e)}", exc_info=True)
                    raise
                    
        except Exception as e:
            logger.error(f"Database connection error in update_process: {str(e)}", exc_info=True)
            raise

    async def save_transcript(self, meeting_id: str, transcript_text: str, model: str, model_name: str, 
                            chunk_size: int, overlap: int):
        """Save transcript data"""
        # Input validation
        if not meeting_id or not meeting_id.strip():
            raise ValueError("meeting_id cannot be empty")
        if not transcript_text or not transcript_text.strip():
            raise ValueError("transcript_text cannot be empty")
        if chunk_size <= 0 or overlap < 0:
            raise ValueError("Invalid chunk_size or overlap values")
        if len(transcript_text) > 10_000_000:  # 10MB limit
            raise ValueError("Transcript text too large (>10MB)")
            
        now = datetime.utcnow().isoformat()
        
        try:
            async with self._get_connection() as conn:
                await conn.execute("BEGIN TRANSACTION")
                
                try:
                    # First try to update existing transcript
                    await conn.execute("""
                        UPDATE transcript_chunks 
                        SET transcript_text = ?, model = ?, model_name = ?, chunk_size = ?, overlap = ?, created_at = ?
                        WHERE meeting_id = ?
                    """, (transcript_text, model, model_name, chunk_size, overlap, now, meeting_id))
                    
                    # If no rows were updated, insert a new one
                    if conn.total_changes == 0:
                        await conn.execute("""
                            INSERT INTO transcript_chunks (meeting_id, transcript_text, model, model_name, chunk_size, overlap, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (meeting_id, transcript_text, model, model_name, chunk_size, overlap, now))
                    
                    await conn.commit()
                    logger.info(f"Successfully saved transcript for meeting_id: {meeting_id} (size: {len(transcript_text)} chars)")
                    
                except Exception as e:
                    await conn.rollback()
                    logger.error(f"Failed to save transcript for meeting_id {meeting_id}: {str(e)}", exc_info=True)
                    raise
                    
        except Exception as e:
            logger.error(f"Database connection error in save_transcript: {str(e)}", exc_info=True)
            raise

    async def update_meeting_name(self, meeting_id: str, meeting_name: str):
        """Update meeting name in both meetings and transcript_chunks tables"""
        now = datetime.utcnow().isoformat()
        async with self._get_connection() as conn:
            # Update meetings table
            await conn.execute("""
                UPDATE meetings
                SET title = ?, updated_at = ?
                WHERE id = ?
            """, (meeting_name, now, meeting_id))
            
            # Update transcript_chunks table
            await conn.execute("""
                UPDATE transcript_chunks
                SET meeting_name = ?
                WHERE meeting_id = ?
            """, (meeting_name, meeting_id))
            
            await conn.commit()

    async def get_transcript_data(self, meeting_id: str):
        """Get transcript data for a meeting"""
        async with self._get_connection() as conn:
            async with conn.execute("""
                SELECT t.*, p.status, p.result, p.error 
                FROM transcript_chunks t 
                JOIN summary_processes p ON t.meeting_id = p.meeting_id 
                WHERE t.meeting_id = ?
            """, (meeting_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(zip([col[0] for col in cursor.description], row))
                return None

    async def save_meeting(self, meeting_id: str, title: str, folder_path: str = None):
        """Save or update a meeting"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # Check if meeting exists
                cursor.execute("SELECT id FROM meetings WHERE id = ? OR title = ?", (meeting_id, title))
                existing_meeting = cursor.fetchone()

                if not existing_meeting:
                    # Create new meeting with local timestamp and folder path
                    cursor.execute("""
                        INSERT INTO meetings (id, title, created_at, updated_at, folder_path)
                        VALUES (?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'), ?)
                    """, (meeting_id, title, folder_path))
                    logger.info(f"Saved meeting {meeting_id} with folder_path: {folder_path}")
                else:
                    # If we get here and meeting exists, throw error since we don't want duplicates
                    raise Exception(f"Meeting with ID {meeting_id} already exists")
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error saving meeting: {str(e)}")
            raise

    async def save_meeting_transcript(self, meeting_id: str, transcript: str, timestamp: str,
                                     summary: str = "", action_items: str = "", key_points: str = "",
                                     audio_start_time: float = None, audio_end_time: float = None, duration: float = None):
        """Save a transcript for a meeting with optional recording-relative timestamps"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # Save transcript with NEW timestamp fields for playback sync
                cursor.execute("""
                    INSERT INTO transcripts (
                        meeting_id, transcript, timestamp, summary, action_items, key_points,
                        audio_start_time, audio_end_time, duration
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (meeting_id, transcript, timestamp, summary, action_items, key_points,
                      audio_start_time, audio_end_time, duration))

                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error saving transcript: {str(e)}")
            raise

    async def get_meeting(self, meeting_id: str):
        """Get a meeting by ID with all its transcripts"""
        try:
            async with self._get_connection() as conn:
                # Get meeting details
                cursor = await conn.execute("""
                    SELECT id, title, created_at, updated_at
                    FROM meetings
                    WHERE id = ?
                """, (meeting_id,))
                meeting = await cursor.fetchone()
                
                if not meeting:
                    return None
                
                # Get all transcripts for this meeting with NEW timestamp fields
                cursor = await conn.execute("""
                    SELECT transcript, timestamp, audio_start_time, audio_end_time, duration
                    FROM transcripts
                    WHERE meeting_id = ?
                """, (meeting_id,))
                transcripts = await cursor.fetchall()

                return {
                    'id': meeting[0],
                    'title': meeting[1],
                    'created_at': meeting[2],
                    'updated_at': meeting[3],
                    'transcripts': [{
                        'id': meeting_id,
                        'text': transcript[0],
                        'timestamp': transcript[1],
                        # NEW: Recording-relative timestamps for playback sync
                        'audio_start_time': transcript[2],
                        'audio_end_time': transcript[3],
                        'duration': transcript[4]
                    } for transcript in transcripts]
                }
        except Exception as e:
            logger.error(f"Error getting meeting: {str(e)}")
            raise

    async def update_meeting_title(self, meeting_id: str, new_title: str):
        """Update a meeting's title"""
        now = datetime.utcnow().isoformat()
        async with self._get_connection() as conn:
            await conn.execute("""
                UPDATE meetings
                SET title = ?, updated_at = ?
                WHERE id = ?
            """, (new_title, now, meeting_id))
            await conn.commit()

    async def get_all_meetings(self):
        """Get all meetings with basic information"""
        async with self._get_connection() as conn:
            cursor = await conn.execute("""
                SELECT id, title, created_at
                FROM meetings
                ORDER BY created_at DESC
            """)
            rows = await cursor.fetchall()
            return [{
                'id': row[0],
                'title': row[1],
                'created_at': row[2]
            } for row in rows]

    async def delete_meeting(self, meeting_id: str):
        """Delete a meeting and all its associated data"""
        if not meeting_id or not meeting_id.strip():
            raise ValueError("meeting_id cannot be empty")
            
        try:
            async with self._get_connection() as conn:
                await conn.execute("BEGIN TRANSACTION")
                
                try:
                    # Check if meeting exists before deletion
                    cursor = await conn.execute("SELECT id FROM meetings WHERE id = ?", (meeting_id,))
                    meeting = await cursor.fetchone()
                    
                    if not meeting:
                        logger.warning(f"Meeting {meeting_id} not found for deletion")
                        await conn.rollback()
                        return False
                    
                    # Delete in proper order to respect foreign key constraints
                    # Delete from transcript_chunks
                    await conn.execute("DELETE FROM transcript_chunks WHERE meeting_id = ?", (meeting_id,))
                    
                    # Delete from summary_processes
                    await conn.execute("DELETE FROM summary_processes WHERE meeting_id = ?", (meeting_id,))
                    
                    # Delete from transcripts
                    await conn.execute("DELETE FROM transcripts WHERE meeting_id = ?", (meeting_id,))
                    
                    # Delete from meetings
                    cursor = await conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
                    
                    if cursor.rowcount == 0:
                        logger.error(f"Failed to delete meeting {meeting_id} - no rows affected")
                        await conn.rollback()
                        return False
                    
                    await conn.commit()
                    logger.info(f"Successfully deleted meeting {meeting_id} and all associated data")
                    return True
                    
                except Exception as e:
                    await conn.rollback()
                    logger.error(f"Failed to delete meeting {meeting_id}: {str(e)}", exc_info=True)
                    return False
                    
        except Exception as e:
            logger.error(f"Database connection error in delete_meeting: {str(e)}", exc_info=True)
            return False

    async def get_model_config(self):
        """Get the current model configuration"""
        async with self._get_connection() as conn:
            cursor = await conn.execute("SELECT provider, model, whisperModel FROM settings")
            row = await cursor.fetchone()
            return dict(zip([col[0] for col in cursor.description], row)) if row else None

    async def save_model_config(self, provider: str, model: str, whisperModel: str):
        """Save the model configuration"""
        # Input validation
        if not provider or not provider.strip():
            raise ValueError("Provider cannot be empty")
        if not model or not model.strip():
            raise ValueError("Model cannot be empty")
        if not whisperModel or not whisperModel.strip():
            raise ValueError("Whisper model cannot be empty")
            
        try:
            async with self._get_connection() as conn:
                await conn.execute("BEGIN TRANSACTION")
                
                try:
                    # Check if the configuration already exists
                    cursor = await conn.execute("SELECT id FROM settings")
                    existing_config = await cursor.fetchone()
                    if existing_config:
                        # Update existing configuration
                        await conn.execute("""
                            UPDATE settings 
                            SET provider = ?, model = ?, whisperModel = ?
                            WHERE id = '1'    
                        """, (provider, model, whisperModel))
                    else:
                        # Insert new configuration
                        await conn.execute("""
                            INSERT INTO settings (id, provider, model, whisperModel)
                            VALUES (?, ?, ?, ?)
                        """, ('1', provider, model, whisperModel))
                    
                    await conn.commit()
                    logger.info(f"Successfully saved model configuration: {provider}/{model}")
                    
                except Exception as e:
                    await conn.rollback()
                    logger.error(f"Failed to save model configuration: {str(e)}", exc_info=True)
                    raise
                    
        except Exception as e:
            logger.error(f"Database connection error in save_model_config: {str(e)}", exc_info=True)
            raise


    async def save_api_key(self, api_key: str, provider: str):
        """Save the API key"""
        provider_list = ["openai", "claude", "groq", "ollama"]
        if provider not in provider_list:
            raise ValueError(f"Invalid provider: {provider}")
        if provider == "openai":
            api_key_name = "openaiApiKey"
        elif provider == "claude":
            api_key_name = "anthropicApiKey"
        elif provider == "groq":
            api_key_name = "groqApiKey"
        elif provider == "ollama":
            api_key_name = "ollamaApiKey"
            
        try:
            async with self._get_connection() as conn:
                await conn.execute("BEGIN TRANSACTION")
                
                try:
                    # Check if settings row exists
                    cursor = await conn.execute("SELECT id FROM settings WHERE id = '1'")
                    existing_config = await cursor.fetchone()
                    
                    if existing_config:
                        # Update existing configuration
                        await conn.execute(f"UPDATE settings SET {api_key_name} = ? WHERE id = '1'", (api_key,))
                    else:
                        # Insert new configuration with default values and the API key
                        await conn.execute(f"""
                            INSERT INTO settings (id, provider, model, whisperModel, {api_key_name})
                            VALUES (?, ?, ?, ?, ?)
                        """, ('1', 'openai', 'gpt-4o-2024-11-20', 'large-v3', api_key))
                        
                    await conn.commit()
                    logger.info(f"Successfully saved API key for provider: {provider}")
                    
                except Exception as e:
                    await conn.rollback()
                    logger.error(f"Failed to save API key for provider {provider}: {str(e)}", exc_info=True)
                    raise
                    
        except Exception as e:
            logger.error(f"Database connection error in save_api_key: {str(e)}", exc_info=True)
            raise

    async def get_api_key(self, provider: str):
        """Get the API key"""
        provider_list = ["openai", "claude", "groq", "ollama"]
        if provider not in provider_list:
            raise ValueError(f"Invalid provider: {provider}")
        if provider == "openai":
            api_key_name = "openaiApiKey"
        elif provider == "claude":
            api_key_name = "anthropicApiKey"
        elif provider == "groq":
            api_key_name = "groqApiKey"
        elif provider == "ollama":
            api_key_name = "ollamaApiKey"
        async with self._get_connection() as conn:
            cursor = await conn.execute(f"SELECT {api_key_name} FROM settings WHERE id = '1'")
            row = await cursor.fetchone()
            return row[0] if row and row[0] else ""

    async def get_transcript_config(self):
        """Get the current transcript configuration"""
        async with self._get_connection() as conn:
            cursor = await conn.execute("SELECT provider, model FROM transcript_settings")
            row = await cursor.fetchone()
            if row:
                return dict(zip([col[0] for col in cursor.description], row))
            else:
                # Return default configuration if no transcript settings exist
                return {
                    "provider": "localWhisper",
                    "model": "large-v3"
                }

    async def save_transcript_config(self, provider: str, model: str):
        """Save the transcript settings"""
        # Input validation
        if not provider or not provider.strip():
            raise ValueError("Provider cannot be empty")
        if not model or not model.strip():
            raise ValueError("Model cannot be empty")
            
        try:
            async with self._get_connection() as conn:
                await conn.execute("BEGIN TRANSACTION")
                
                try:
                    # Check if the configuration already exists
                    cursor = await conn.execute("SELECT id FROM transcript_settings")
                    existing_config = await cursor.fetchone()
                    if existing_config:
                        # Update existing configuration
                        await conn.execute("""
                            UPDATE transcript_settings 
                            SET provider = ?, model = ?
                            WHERE id = '1'
                        """, (provider, model))
                    else:
                        # Insert new configuration
                        await conn.execute("""
                            INSERT INTO transcript_settings (id, provider, model)
                            VALUES (?, ?, ?)
                        """, ('1', provider, model))
                    
                    await conn.commit()
                    logger.info(f"Successfully saved transcript configuration: {provider}/{model}")
                    
                except Exception as e:
                    await conn.rollback()
                    logger.error(f"Failed to save transcript configuration: {str(e)}", exc_info=True)
                    raise
                    
        except Exception as e:
            logger.error(f"Database connection error in save_transcript_config: {str(e)}", exc_info=True)
            raise

    async def save_transcript_api_key(self, api_key: str, provider: str):
        """Save the transcript API key"""
        provider_list = ["localWhisper","deepgram","elevenLabs","groq","openai"]
        if provider not in provider_list:
            raise ValueError(f"Invalid provider: {provider}")
        if provider == "localWhisper":
            api_key_name = "whisperApiKey"
        elif provider == "deepgram":
            api_key_name = "deepgramApiKey"
        elif provider == "elevenLabs":
            api_key_name = "elevenLabsApiKey"
        elif provider == "groq":
            api_key_name = "groqApiKey"
        elif provider == "openai":
            api_key_name = "openaiApiKey"
            
        try:
            async with self._get_connection() as conn:
                await conn.execute("BEGIN TRANSACTION")
                
                try:
                    # Check if transcript settings row exists
                    cursor = await conn.execute("SELECT id FROM transcript_settings WHERE id = '1'")
                    existing_config = await cursor.fetchone()
                    
                    if existing_config:
                        # Update existing configuration
                        await conn.execute(f"UPDATE transcript_settings SET {api_key_name} = ? WHERE id = '1'", (api_key,))
                    else:
                        # Insert new configuration with default values and the API key
                        await conn.execute(f"""
                            INSERT INTO transcript_settings (id, provider, model, {api_key_name})
                            VALUES (?, ?, ?, ?)
                        """, ('1', 'localWhisper', 'large-v3', api_key))
                        
                    await conn.commit()
                    logger.info(f"Successfully saved transcript API key for provider: {provider}")
                    
                except Exception as e:
                    await conn.rollback()
                    logger.error(f"Failed to save transcript API key for provider {provider}: {str(e)}", exc_info=True)
                    raise
                    
        except Exception as e:
            logger.error(f"Database connection error in save_transcript_api_key: {str(e)}", exc_info=True)
            raise


    async def get_transcript_api_key(self, provider: str):
        """Get the transcript API key"""
        provider_list = ["localWhisper","deepgram","elevenLabs","groq","openai"]
        if provider not in provider_list:
            raise ValueError(f"Invalid provider: {provider}")
        if provider == "localWhisper":
            api_key_name = "whisperApiKey"
        elif provider == "deepgram":
            api_key_name = "deepgramApiKey"
        elif provider == "elevenLabs":
            api_key_name = "elevenLabsApiKey"
        elif provider == "groq":
            api_key_name = "groqApiKey"
        elif provider == "openai":
            api_key_name = "openaiApiKey"
        async with self._get_connection() as conn:
            cursor = await conn.execute(f"SELECT {api_key_name} FROM transcript_settings WHERE id = '1'")
            row = await cursor.fetchone()
            return row[0] if row and row[0] else ""

    async def search_transcripts(self, query: str):
        """Search through meeting transcripts for the given query"""
        if not query or query.strip() == "":
            return []
            
        # Convert query to lowercase for case-insensitive search
        search_query = f"%{query.lower()}%"
        
        try:
            async with self._get_connection() as conn:
                # Search in transcripts table
                cursor = await conn.execute("""
                    SELECT m.id, m.title, t.transcript, t.timestamp
                    FROM meetings m
                    JOIN transcripts t ON m.id = t.meeting_id
                    WHERE LOWER(t.transcript) LIKE ?
                    ORDER BY m.created_at DESC
                """, (search_query,))
                
                rows = await cursor.fetchall()
                
                # Also search in transcript_chunks for full transcripts
                cursor2 = await conn.execute("""
                    SELECT m.id, m.title, tc.transcript_text
                    FROM meetings m
                    JOIN transcript_chunks tc ON m.id = tc.meeting_id
                    WHERE LOWER(tc.transcript_text) LIKE ?
                    AND m.id NOT IN (SELECT DISTINCT meeting_id FROM transcripts WHERE LOWER(transcript) LIKE ?)
                    ORDER BY m.created_at DESC
                """, (search_query, search_query))
                
                chunk_rows = await cursor2.fetchall()
                
                # Format the results
                results = []
                
                # Process transcript matches
                for row in rows:
                    meeting_id, title, transcript, timestamp = row
                    
                    # Find the matching context (snippet around the match)
                    transcript_lower = transcript.lower()
                    match_index = transcript_lower.find(query.lower())
                    
                    # Extract context around the match (100 chars before and after)
                    start_index = max(0, match_index - 100)
                    end_index = min(len(transcript), match_index + len(query) + 100)
                    context = transcript[start_index:end_index]
                    
                    # Add ellipsis if we truncated the text
                    if start_index > 0:
                        context = "..." + context
                    if end_index < len(transcript):
                        context += "..."
                    
                    results.append({
                        'id': meeting_id,
                        'title': title,
                        'matchContext': context,
                        'timestamp': timestamp
                    })
                
                # Process transcript_chunks matches
                for row in chunk_rows:
                    meeting_id, title, transcript_text = row
                    
                    # Find the matching context (snippet around the match)
                    transcript_lower = transcript_text.lower()
                    match_index = transcript_lower.find(query.lower())
                    
                    # Extract context around the match (100 chars before and after)
                    start_index = max(0, match_index - 100)
                    end_index = min(len(transcript_text), match_index + len(query) + 100)
                    context = transcript_text[start_index:end_index]
                    
                    # Add ellipsis if we truncated the text
                    if start_index > 0:
                        context = "..." + context
                    if end_index < len(transcript_text):
                        context += "..."
                    
                    results.append({
                        'id': meeting_id,
                        'title': title,
                        'matchContext': context,
                        'timestamp': datetime.utcnow().isoformat()  # Use current time as fallback
                    })
                
                return results
                
        except Exception as e:
            logger.error(f"Error searching transcripts: {str(e)}")
            raise
        
    async def delete_api_key(self, provider: str):
        """Delete the API key"""
        provider_list = ["openai", "claude", "groq", "ollama"]
        if provider not in provider_list:
            raise ValueError(f"Invalid provider: {provider}")
        if provider == "openai":
            api_key_name = "openaiApiKey"
        elif provider == "claude":
            api_key_name = "anthropicApiKey"
        elif provider == "groq":
            api_key_name = "groqApiKey"
        elif provider == "ollama":
            api_key_name = "ollamaApiKey"
        async with self._get_connection() as conn:
            await conn.execute(f"UPDATE settings SET {api_key_name} = NULL WHERE id = '1'")
            await conn.commit()
    
    async def update_meeting_summary(self, meeting_id: str, summary: dict):
        """Update a meeting's summary"""
        now = datetime.utcnow().isoformat()
        try:
            async with self._get_connection() as conn:
                # Check if the meeting exists
                cursor = await conn.execute("SELECT id FROM meetings WHERE id = ?", (meeting_id,))
                meeting = await cursor.fetchone()
                
                if not meeting:
                    raise ValueError(f"Meeting with ID {meeting_id} not found")
                
                # Update the summary in the summary_processes table
                await conn.execute("""
                    UPDATE summary_processes
                    SET result = ?, updated_at = ?
                    WHERE meeting_id = ?
                """, (json.dumps(summary), now, meeting_id))
                
                # Update the meeting's updated_at timestamp
                await conn.execute("""
                    UPDATE meetings
                    SET updated_at = ?
                    WHERE id = ?
                """, (now, meeting_id))
                
                await conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error updating meeting summary: {str(e)}")
            raise

    # ------------------------------------------------------------------
    # Users (internal-org Google auth)
    # ------------------------------------------------------------------
    @staticmethod
    def _row_to_user(row) -> Optional[Dict]:
        """Map a users row (id, google_sub, email, name, picture, is_admin, created_at, last_login_at) to a dict."""
        if not row:
            return None
        return {
            "id": row[0],
            "google_sub": row[1],
            "email": row[2],
            "name": row[3],
            "picture": row[4],
            "is_admin": bool(row[5]),
            "created_at": row[6],
            "last_login_at": row[7],
        }

    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Fetch a user by internal id."""
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id, google_sub, email, name, picture, is_admin, created_at, last_login_at "
                "FROM users WHERE id = ?",
                (user_id,),
            )
            return self._row_to_user(await cursor.fetchone())

    async def upsert_user(self, google_sub: str, email: str, name: str = None,
                          picture: str = None) -> Dict:
        """Insert or update a user on sign-in, matched by google_sub or email.

        The very first user to sign in is bootstrapped as an admin so there is
        always at least one administrator for the org.
        """
        if not email or not email.strip():
            raise ValueError("email cannot be empty")

        now = datetime.utcnow().isoformat()
        try:
            async with self._get_connection() as conn:
                await conn.execute("BEGIN TRANSACTION")
                try:
                    cursor = await conn.execute(
                        "SELECT id FROM users WHERE google_sub = ? OR email = ?",
                        (google_sub, email),
                    )
                    existing = await cursor.fetchone()

                    if existing:
                        user_id = existing[0]
                        await conn.execute(
                            """
                            UPDATE users
                            SET google_sub = ?, email = ?, name = ?, picture = ?, last_login_at = ?
                            WHERE id = ?
                            """,
                            (google_sub, email, name, picture, now, user_id),
                        )
                    else:
                        user_id = f"user-{uuid.uuid4().hex}"
                        count_cursor = await conn.execute("SELECT COUNT(*) FROM users")
                        is_admin = 1 if (await count_cursor.fetchone())[0] == 0 else 0
                        await conn.execute(
                            """
                            INSERT INTO users
                                (id, google_sub, email, name, picture, is_admin, created_at, last_login_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (user_id, google_sub, email, name, picture, is_admin, now, now),
                        )
                    await conn.commit()
                    logger.info(f"Upserted user {email} (id={user_id})")
                except Exception:
                    await conn.rollback()
                    raise
        except Exception as e:
            logger.error(f"Error upserting user {email}: {str(e)}", exc_info=True)
            raise

        return await self.get_user_by_id(user_id)

    # ------------------------------------------------------------------
    # Owned meetings (shared-backend MVP ingest)
    # ------------------------------------------------------------------
    async def create_owned_meeting(self, meeting_id: str, title: str, owner_id: str,
                                   source: str = "desktop", started_at: str = None) -> None:
        """Create a meeting owned by a user, in the 'processing' state."""
        if not owner_id:
            raise ValueError("owner_id is required")
        async with self._get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO meetings
                    (id, title, created_at, updated_at, owner_id, status, source, started_at, audio_uploaded)
                VALUES (?, ?, datetime('now','localtime'), datetime('now','localtime'), ?, 'processing', ?, ?, 0)
                """,
                (meeting_id, title, owner_id, source, started_at),
            )
            await conn.commit()
            logger.info(f"Created owned meeting {meeting_id} for owner {owner_id}")

    async def add_meeting_segments(self, meeting_id: str, segments: list) -> int:
        """Bulk-insert transcript segments for a meeting. Each segment is a dict
        with keys: text, timestamp?, audio_start_time?, audio_end_time?, duration?."""
        inserted = 0
        async with self._get_connection() as conn:
            for s in segments:
                await conn.execute(
                    """
                    INSERT INTO transcripts
                        (meeting_id, transcript, timestamp, summary, action_items, key_points,
                         audio_start_time, audio_end_time, duration)
                    VALUES (?, ?, ?, '', '', '', ?, ?, ?)
                    """,
                    (
                        meeting_id,
                        s.get("text", ""),
                        s.get("timestamp") or datetime.utcnow().isoformat(),
                        s.get("audio_start_time"),
                        s.get("audio_end_time"),
                        s.get("duration"),
                    ),
                )
                inserted += 1
            await conn.commit()
        logger.info(f"Inserted {inserted} segments for meeting {meeting_id}")
        return inserted

    async def set_meeting_status(self, meeting_id: str, status: str) -> None:
        """Update a meeting's processing status (processing|ready|failed)."""
        now = datetime.utcnow().isoformat()
        async with self._get_connection() as conn:
            await conn.execute(
                "UPDATE meetings SET status = ?, updated_at = ? WHERE id = ?",
                (status, now, meeting_id),
            )
            await conn.commit()

    async def set_meeting_audio(self, meeting_id: str, uploaded: bool = True) -> None:
        """Mark whether a meeting's audio file has been uploaded."""
        async with self._get_connection() as conn:
            await conn.execute(
                "UPDATE meetings SET audio_uploaded = ? WHERE id = ?",
                (1 if uploaded else 0, meeting_id),
            )
            await conn.commit()

    async def get_meeting_access_info(self, meeting_id: str) -> Optional[Dict]:
        """Return ownership/status info for authorization, or None if not found."""
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id, owner_id, status, audio_uploaded, project_id FROM meetings WHERE id = ?",
                (meeting_id,),
            )
            row = await cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "owner_id": row[1],
                "status": row[2],
                "audio_uploaded": bool(row[3]),
                "project_id": row[4],
            }

    # ------------------------------------------------------------------
    # Sharing (share_grants) + access resolution
    # ------------------------------------------------------------------
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Fetch a user by email (used to resolve a share target)."""
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id, google_sub, email, name, picture, is_admin, created_at, last_login_at "
                "FROM users WHERE email = ?",
                (email,),
            )
            return self._row_to_user(await cursor.fetchone())

    async def get_share_grant(self, grant_id: str) -> Optional[Dict]:
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id, meeting_id, grantee_id, all_org, role, created_by, created_at "
                "FROM share_grants WHERE id = ?",
                (grant_id,),
            )
            row = await cursor.fetchone()
            if not row:
                return None
            return {
                "id": row[0], "meeting_id": row[1], "grantee_id": row[2],
                "all_org": bool(row[3]), "role": row[4],
                "created_by": row[5], "created_at": row[6],
            }

    async def upsert_share_grant(self, meeting_id: str, grantee_id: str = None,
                                 all_org: bool = False, role: str = "viewer",
                                 created_by: str = None) -> Dict:
        """Create or update a share grant. One row per (meeting, grantee), and a
        single all_org row per meeting; re-granting just updates the role."""
        if role not in ("viewer", "editor"):
            raise ValueError("role must be 'viewer' or 'editor'")
        if not all_org and not grantee_id:
            raise ValueError("grantee_id is required unless all_org is set")

        now = datetime.utcnow().isoformat()
        async with self._get_connection() as conn:
            await conn.execute("BEGIN TRANSACTION")
            try:
                if all_org:
                    cursor = await conn.execute(
                        "SELECT id FROM share_grants WHERE meeting_id = ? AND all_org = 1",
                        (meeting_id,),
                    )
                else:
                    cursor = await conn.execute(
                        "SELECT id FROM share_grants WHERE meeting_id = ? AND grantee_id = ? AND all_org = 0",
                        (meeting_id, grantee_id),
                    )
                existing = await cursor.fetchone()

                if existing:
                    grant_id = existing[0]
                    await conn.execute(
                        "UPDATE share_grants SET role = ? WHERE id = ?",
                        (role, grant_id),
                    )
                else:
                    grant_id = f"grant-{uuid.uuid4().hex}"
                    await conn.execute(
                        """
                        INSERT INTO share_grants
                            (id, meeting_id, grantee_id, all_org, role, created_by, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (grant_id, meeting_id, None if all_org else grantee_id,
                         1 if all_org else 0, role, created_by, now),
                    )
                await conn.commit()
            except Exception:
                await conn.rollback()
                raise
        return await self.get_share_grant(grant_id)

    async def list_share_grants(self, meeting_id: str) -> list:
        """List all grants for a meeting, resolving grantee email/name."""
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                """
                SELECT sg.id, sg.grantee_id, sg.all_org, sg.role, sg.created_at,
                       u.email, u.name
                FROM share_grants sg
                LEFT JOIN users u ON sg.grantee_id = u.id
                WHERE sg.meeting_id = ?
                ORDER BY sg.created_at
                """,
                (meeting_id,),
            )
            rows = await cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "grantee_id": r[1],
                    "all_org": bool(r[2]),
                    "role": r[3],
                    "created_at": r[4],
                    "grantee_email": r[5],
                    "grantee_name": r[6],
                }
                for r in rows
            ]

    async def revoke_share_grant(self, meeting_id: str, grant_id: str) -> bool:
        """Delete a grant scoped to its meeting. Returns True if a row was removed."""
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                "DELETE FROM share_grants WHERE id = ? AND meeting_id = ?",
                (grant_id, meeting_id),
            )
            await conn.commit()
            return cursor.rowcount > 0

    async def get_share_role(self, meeting_id: str, user_id: str) -> Optional[str]:
        """Return the effective shared role for a user on a meeting via grants
        (explicit grant and/or all_org), or None. Editor outranks viewer.
        Does NOT consider ownership/admin — the caller handles those."""
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                "SELECT role FROM share_grants WHERE meeting_id = ? AND grantee_id = ? AND all_org = 0",
                (meeting_id, user_id),
            )
            explicit = await cursor.fetchone()
            cursor = await conn.execute(
                "SELECT role FROM share_grants WHERE meeting_id = ? AND all_org = 1",
                (meeting_id,),
            )
            org = await cursor.fetchone()

        roles = {r[0] for r in (explicit, org) if r}
        if "editor" in roles:
            return "editor"
        if "viewer" in roles:
            return "viewer"
        return None

    async def get_meeting_summary(self, meeting_id: str) -> Optional[Dict]:
        """Read the raw summary process row for a meeting (status/result/error),
        independent of transcript_chunks. Returns None if no process exists."""
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                "SELECT status, result, error, updated_at FROM summary_processes WHERE meeting_id = ?",
                (meeting_id,),
            )
            row = await cursor.fetchone()
            if not row:
                return None
            return {"status": row[0], "result": row[1], "error": row[2], "updated_at": row[3]}

    async def list_accessible_meetings(self, user_id: str, is_admin: bool = False) -> list:
        """Meetings a user can see: owned, explicitly shared, or shared all-org
        (admins see everything). Ordered newest first. Used by the Library."""
        async with self._get_connection() as conn:
            if is_admin:
                cursor = await conn.execute(
                    """
                    SELECT id, title, created_at, owner_id, status, audio_uploaded, project_id
                    FROM meetings ORDER BY created_at DESC
                    """
                )
            else:
                cursor = await conn.execute(
                    """
                    SELECT DISTINCT m.id, m.title, m.created_at, m.owner_id, m.status,
                                    m.audio_uploaded, m.project_id
                    FROM meetings m
                    LEFT JOIN share_grants sg ON sg.meeting_id = m.id
                    WHERE m.owner_id = ?
                       OR (sg.grantee_id = ? AND sg.all_org = 0)
                       OR sg.all_org = 1
                    ORDER BY m.created_at DESC
                    """,
                    (user_id, user_id),
                )
            rows = await cursor.fetchall()
            return [
                {
                    "id": r[0],
                    "title": r[1],
                    "created_at": r[2],
                    "owner_id": r[3],
                    "status": r[4],
                    "audio_uploaded": bool(r[5]),
                    "project_id": r[6],
                }
                for r in rows
            ]

    # ------------------------------------------------------------------
    # Projects (filing a meeting series) + Unassigned triage
    # ------------------------------------------------------------------
    @staticmethod
    def _row_to_project(row) -> Optional[Dict]:
        """Map a projects row (id, name, owner_id, created_at, updated_at) to a dict."""
        if not row:
            return None
        return {
            "id": row[0],
            "name": row[1],
            "owner_id": row[2],
            "created_at": row[3],
            "updated_at": row[4],
        }

    async def create_project(self, name: str, owner_id: str) -> Dict:
        """Create a project owned by a user."""
        if not name or not name.strip():
            raise ValueError("name cannot be empty")
        if not owner_id:
            raise ValueError("owner_id is required")

        project_id = f"project-{uuid.uuid4().hex}"
        now = datetime.utcnow().isoformat()
        async with self._get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO projects (id, name, owner_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (project_id, name.strip(), owner_id, now, now),
            )
            await conn.commit()
        logger.info(f"Created project {project_id} ('{name.strip()}') for owner {owner_id}")
        return await self.get_project(project_id)

    async def get_project(self, project_id: str) -> Optional[Dict]:
        """Fetch a single project by id."""
        async with self._get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id, name, owner_id, created_at, updated_at FROM projects WHERE id = ?",
                (project_id,),
            )
            return self._row_to_project(await cursor.fetchone())

    async def list_projects(self, user_id: str, is_admin: bool = False) -> list:
        """List projects a user can see (their own; admins see all), each with a
        count of how many meetings the SAME user can access are filed under it."""
        accessible = await self.list_accessible_meetings(user_id, is_admin)
        counts: Dict[str, int] = {}
        for m in accessible:
            pid = m.get("project_id")
            if pid:
                counts[pid] = counts.get(pid, 0) + 1

        async with self._get_connection() as conn:
            if is_admin:
                cursor = await conn.execute(
                    "SELECT id, name, owner_id, created_at, updated_at "
                    "FROM projects ORDER BY created_at DESC"
                )
            else:
                cursor = await conn.execute(
                    "SELECT id, name, owner_id, created_at, updated_at "
                    "FROM projects WHERE owner_id = ? ORDER BY created_at DESC",
                    (user_id,),
                )
            rows = await cursor.fetchall()

        projects = []
        for r in rows:
            p = self._row_to_project(r)
            p["meeting_count"] = counts.get(p["id"], 0)
            projects.append(p)
        return projects

    async def set_meeting_project(self, meeting_id: str, project_id: Optional[str]) -> None:
        """File a meeting under a project, or clear it (project_id=None -> unassigned)."""
        now = datetime.utcnow().isoformat()
        async with self._get_connection() as conn:
            await conn.execute(
                "UPDATE meetings SET project_id = ?, updated_at = ? WHERE id = ?",
                (project_id, now, meeting_id),
            )
            await conn.commit()
        logger.info(
            f"Filed meeting {meeting_id} under project {project_id}"
            if project_id else f"Moved meeting {meeting_id} back to Unassigned"
        )
