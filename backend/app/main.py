from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import uvicorn
from typing import Optional, List
import logging
import os
import shutil
import glob
import re
from dotenv import load_dotenv
from db import DatabaseManager
from auth import (
    verify_google_id_token,
    create_session_jwt,
    get_current_user,
    CurrentUser,
    AuthError,
)
import json
from threading import Lock
from transcript_processor import TranscriptProcessor
import time

# Load environment variables
load_dotenv()

# Configure logger with line numbers and function names
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create console handler with formatting
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)

# Create formatter with line numbers and function names
formatter = logging.Formatter(
    '%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d - %(funcName)s()] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
console_handler.setFormatter(formatter)

# Add handler to logger if not already added
if not logger.handlers:
    logger.addHandler(console_handler)

app = FastAPI(
    title="Meeting Summarizer API",
    description="API for processing and summarizing meeting transcripts",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],     # Allow all methods
    allow_headers=["*"],     # Allow all headers
    max_age=3600,            # Cache preflight requests for 1 hour
)

# Global database manager instance for meeting management endpoints
db = DatabaseManager()

# ----------------------------------------------------------------------
# Auth (internal-org Google sign-in)
# ----------------------------------------------------------------------
class GoogleAuthRequest(BaseModel):
    id_token: str

@app.post("/auth/google")
async def auth_google(req: GoogleAuthRequest):
    """Exchange a Google ID token for a Saransh session JWT.

    The desktop app completes Google OAuth (PKCE) and posts the resulting
    ID token here. We verify it (signature, audience, org domain), upsert the
    user, and return a session token used as Bearer on all later calls.
    """
    try:
        claims = verify_google_id_token(req.id_token)
    except AuthError as e:
        logger.warning(f"Rejected Google sign-in: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

    try:
        user = await db.upsert_user(
            google_sub=claims["sub"],
            email=claims.get("email"),
            name=claims.get("name"),
            picture=claims.get("picture"),
        )
        token = create_session_jwt(
            user_id=user["id"],
            email=user["email"],
            name=user["name"],
            is_admin=user["is_admin"],
        )
    except AuthError as e:
        # e.g. server missing JWT_SECRET
        logger.error(f"Auth configuration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error completing Google sign-in: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Sign-in failed")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "picture": user["picture"],
            "is_admin": user["is_admin"],
        },
    }

@app.get("/auth/me")
async def auth_me(user: CurrentUser = Depends(get_current_user)):
    """Return the currently authenticated user (validates the session token)."""
    return user

# New Pydantic models for meeting management
class Transcript(BaseModel):
    id: str
    text: str
    timestamp: str
    # Recording-relative timestamps for audio-transcript synchronization
    audio_start_time: Optional[float] = None
    audio_end_time: Optional[float] = None
    duration: Optional[float] = None

class MeetingResponse(BaseModel):
    id: str
    title: str

class MeetingDetailsResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    transcripts: List[Transcript]

class MeetingTitleUpdate(BaseModel):
    meeting_id: str
    title: str

class DeleteMeetingRequest(BaseModel):
    meeting_id: str

class SaveTranscriptRequest(BaseModel):
    meeting_title: str
    transcripts: List[Transcript]
    folder_path: Optional[str] = None  # NEW: Path to meeting folder (for new folder structure)

class SaveModelConfigRequest(BaseModel):
    provider: str
    model: str
    whisperModel: str
    apiKey: Optional[str] = None

class SaveTranscriptConfigRequest(BaseModel):
    provider: str
    model: str
    apiKey: Optional[str] = None

class TranscriptRequest(BaseModel):
    """Request model for transcript text, updated with meeting_id"""
    text: str
    model: str
    model_name: str
    meeting_id: str
    chunk_size: Optional[int] = 5000
    overlap: Optional[int] = 1000
    custom_prompt: Optional[str] = "Generate a summary of the meeting transcript."

class SummaryProcessor:
    """Handles the processing of summaries in a thread-safe way"""
    def __init__(self):
        try:
            self.db = DatabaseManager()

            logger.info("Initializing SummaryProcessor components")
            self.transcript_processor = TranscriptProcessor()
            logger.info("SummaryProcessor initialized successfully (core components)")
        except Exception as e:
            logger.error(f"Failed to initialize SummaryProcessor: {str(e)}", exc_info=True)
            raise

    async def process_transcript(self, text: str, model: str, model_name: str, chunk_size: int = 5000, overlap: int = 1000, custom_prompt: str = "Generate a summary of the meeting transcript.") -> tuple:
        """Process a transcript text"""
        try:
            if not text:
                raise ValueError("Empty transcript text provided")

            # Validate chunk_size and overlap
            if chunk_size <= 0:
                raise ValueError("chunk_size must be positive")
            if overlap < 0:
                raise ValueError("overlap must be non-negative")
            if overlap >= chunk_size:
                overlap = chunk_size - 1  # Ensure overlap is less than chunk_size

            # Ensure step size is positive
            step_size = chunk_size - overlap
            if step_size <= 0:
                chunk_size = overlap + 1  # Adjust chunk_size to ensure positive step

            logger.info(f"Processing transcript of length {len(text)} with chunk_size={chunk_size}, overlap={overlap}")
            num_chunks, all_json_data = await self.transcript_processor.process_transcript(
                text=text,
                model=model,
                model_name=model_name,
                chunk_size=chunk_size,
                overlap=overlap,
                custom_prompt=custom_prompt
            )
            logger.info(f"Successfully processed transcript into {num_chunks} chunks")

            return num_chunks, all_json_data
        except Exception as e:
            logger.error(f"Error processing transcript: {str(e)}", exc_info=True)
            raise

    def cleanup(self):
        """Cleanup resources"""
        try:
            logger.info("Cleaning up resources")
            if hasattr(self, 'transcript_processor'):
                self.transcript_processor.cleanup()
            logger.info("Cleanup completed successfully")
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}", exc_info=True)

# Initialize processor
processor = SummaryProcessor()

# New meeting management endpoints
@app.get("/get-meetings", response_model=List[MeetingResponse])
async def get_meetings():
    """Get all meetings with their basic information"""
    try:
        meetings = await db.get_all_meetings()
        return [{"id": meeting["id"], "title": meeting["title"]} for meeting in meetings]
    except Exception as e:
        logger.error(f"Error getting meetings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-meeting/{meeting_id}", response_model=MeetingDetailsResponse)
async def get_meeting(meeting_id: str):
    """Get a specific meeting by ID with all its details"""
    try:
        meeting = await db.get_meeting(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return meeting
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meeting: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/save-meeting-title")
async def save_meeting_title(data: MeetingTitleUpdate):
    """Save a meeting title"""
    try:
        await db.update_meeting_title(data.meeting_id, data.title)
        return {"message": "Meeting title saved successfully"}
    except Exception as e:
        logger.error(f"Error saving meeting title: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delete-meeting")
async def delete_meeting(data: DeleteMeetingRequest):
    """Delete a meeting and all its associated data"""
    try:
        success = await db.delete_meeting(data.meeting_id)
        if success:
            return {"message": "Meeting deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete meeting")
    except Exception as e:
        logger.error(f"Error deleting meeting: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def aggregate_chunk_summaries(all_json_data: list) -> dict:
    """Aggregate per-chunk summary JSON strings into one final summary structure.

    Shared by the legacy /process-transcript flow and the new /api/meetings/ingest
    flow so both produce identically-shaped summaries.
    """
    final_summary = {
        "MeetingName": "",
        "People": {"title": "People", "blocks": []},
        "SessionSummary": {"title": "Session Summary", "blocks": []},
        "CriticalDeadlines": {"title": "Critical Deadlines", "blocks": []},
        "KeyItemsDecisions": {"title": "Key Items & Decisions", "blocks": []},
        "ImmediateActionItems": {"title": "Immediate Action Items", "blocks": []},
        "NextSteps": {"title": "Next Steps", "blocks": []},
        "MeetingNotes": {
            "meeting_name": "",
            "sections": []
        }
    }

    for json_str in all_json_data:
        try:
            json_dict = json.loads(json_str)
            if "MeetingName" in json_dict and json_dict["MeetingName"]:
                final_summary["MeetingName"] = json_dict["MeetingName"]
            for key in final_summary:
                if key == "MeetingNotes" and key in json_dict:
                    if isinstance(json_dict[key].get("sections"), list):
                        for section in json_dict[key]["sections"]:
                            if not section.get("blocks"):
                                section["blocks"] = []
                        final_summary[key]["sections"].extend(json_dict[key]["sections"])
                    if json_dict[key].get("meeting_name"):
                        final_summary[key]["meeting_name"] = json_dict[key]["meeting_name"]
                elif key != "MeetingName" and key in json_dict and isinstance(json_dict[key], dict) and "blocks" in json_dict[key]:
                    if isinstance(json_dict[key]["blocks"], list):
                        final_summary[key]["blocks"].extend(json_dict[key]["blocks"])
                        section_exists = False
                        for section in final_summary["MeetingNotes"]["sections"]:
                            if section["title"] == json_dict[key]["title"]:
                                section["blocks"].extend(json_dict[key]["blocks"])
                                section_exists = True
                                break
                        if not section_exists:
                            final_summary["MeetingNotes"]["sections"].append({
                                "title": json_dict[key]["title"],
                                "blocks": json_dict[key]["blocks"].copy() if json_dict[key]["blocks"] else []
                            })
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON chunk: {e}. Chunk: {json_str[:100]}...")
        except Exception as e:
            logger.error(f"Error processing chunk data: {e}. Chunk: {json_str[:100]}...")

    return final_summary


async def process_transcript_background(process_id: str, transcript: TranscriptRequest, custom_prompt: str):
    """Background task to process transcript"""
    try:
        logger.info(f"Starting background processing for process_id: {process_id}")
        
        # Early validation for common issues
        if not transcript.text or not transcript.text.strip():
            raise ValueError("Empty transcript text provided")
        
        if transcript.model in ["claude", "groq", "openai"]:
            # Check if API key is available for cloud providers
            api_key = await processor.db.get_api_key(transcript.model)
            if not api_key:
                provider_names = {"claude": "Anthropic", "groq": "Groq", "openai": "OpenAI"}
                raise ValueError(f"{provider_names.get(transcript.model, transcript.model)} API key not configured. Please set your API key in the model settings.")

        _, all_json_data = await processor.process_transcript(
            text=transcript.text,
            model=transcript.model,
            model_name=transcript.model_name,
            chunk_size=transcript.chunk_size,
            overlap=transcript.overlap,
            custom_prompt=custom_prompt
        )

        # Aggregate chunk results into the final summary structure
        final_summary = aggregate_chunk_summaries(all_json_data)

        # Update database with meeting name using meeting_id
        if final_summary["MeetingName"]:
            await processor.db.update_meeting_name(transcript.meeting_id, final_summary["MeetingName"])

        # Save final result
        if all_json_data:
            await processor.db.update_process(process_id, status="completed", result=json.dumps(final_summary))
            logger.info(f"Background processing completed for process_id: {process_id}")
        else:
            error_msg = "Summary generation failed: No chunks were processed successfully. Check logs for specific errors."
            await processor.db.update_process(process_id, status="failed", error=error_msg)
            logger.error(f"Background processing failed for process_id: {process_id} - {error_msg}")

    except ValueError as e:
        # Handle specific value errors (like API key issues)
        error_msg = str(e)
        logger.error(f"Configuration error in background processing for {process_id}: {error_msg}", exc_info=True)
        try:
            await processor.db.update_process(process_id, status="failed", error=error_msg)
        except Exception as db_e:
            logger.error(f"Failed to update DB status to failed for {process_id}: {db_e}", exc_info=True)
    except Exception as e:
        # Handle all other exceptions
        error_msg = f"Processing error: {str(e)}"
        logger.error(f"Error in background processing for {process_id}: {error_msg}", exc_info=True)
        try:
            await processor.db.update_process(process_id, status="failed", error=error_msg)
        except Exception as db_e:
            logger.error(f"Failed to update DB status to failed for {process_id}: {db_e}", exc_info=True)

@app.post("/process-transcript")
async def process_transcript_api(
    transcript: TranscriptRequest,
    background_tasks: BackgroundTasks
):
    """Process a transcript text with background processing"""
    try:
        # Create new process linked to meeting_id
        process_id = await processor.db.create_process(transcript.meeting_id)

        # Save transcript data associated with meeting_id
        await processor.db.save_transcript(
            transcript.meeting_id,
            transcript.text,
            transcript.model,
            transcript.model_name,
            transcript.chunk_size,
            transcript.overlap
        )

        custom_prompt = transcript.custom_prompt

        # Start background processing
        background_tasks.add_task(
            process_transcript_background,
            process_id,
            transcript,
            custom_prompt
        )

        return JSONResponse({
            "message": "Processing started",
            "process_id": process_id
        })

    except Exception as e:
        logger.error(f"Error in process_transcript_api: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-summary/{meeting_id}")
async def get_summary(meeting_id: str):
    """Get the summary for a given meeting ID"""
    try:
        result = await processor.db.get_transcript_data(meeting_id)
        if not result:
            return JSONResponse(
                status_code=404,
                content={
                    "status": "error",
                    "meetingName": None,
                    "meeting_id": meeting_id,
                    "data": None,
                    "start": None,
                    "end": None,
                    "error": "Meeting ID not found"
                }
            )

        status = result.get("status", "unknown").lower()
        logger.debug(f"Summary status for meeting {meeting_id}: {status}, error: {result.get('error')}")

        # Parse result data if available
        summary_data = None
        if result.get("result"):
            try:
                parsed_result = json.loads(result["result"])
                if isinstance(parsed_result, str):
                    summary_data = json.loads(parsed_result)
                else:
                    summary_data = parsed_result
                if not isinstance(summary_data, dict):
                    logger.error(f"Parsed summary data is not a dictionary for meeting {meeting_id}")
                    summary_data = None
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON data for meeting {meeting_id}: {str(e)}")
                status = "failed"
                result["error"] = f"Invalid summary data format: {str(e)}"
            except Exception as e:
                logger.error(f"Unexpected error parsing summary data for {meeting_id}: {str(e)}")
                status = "failed"
                result["error"] = f"Error processing summary data: {str(e)}"

        # Transform summary data into frontend format if available - PRESERVE ORDER
        transformed_data = {}
        if isinstance(summary_data, dict) and status == "completed":
            # Add MeetingName to transformed data
            transformed_data["MeetingName"] = summary_data.get("MeetingName", "")

            # Map backend sections to frontend sections
            section_mapping = {
                # "SessionSummary": "key_points",
                # "ImmediateActionItems": "action_items",
                # "KeyItemsDecisions": "decisions",
                # "NextSteps": "next_steps",
                # "CriticalDeadlines": "critical_deadlines",
                # "People": "people"
            }

            # Add each section to transformed data
            for backend_key, frontend_key in section_mapping.items():
                if backend_key in summary_data and isinstance(summary_data[backend_key], dict):
                    transformed_data[frontend_key] = summary_data[backend_key]
            
            # Add meeting notes sections if available - PRESERVE ORDER AND HANDLE DUPLICATES
            if "MeetingNotes" in summary_data and isinstance(summary_data["MeetingNotes"], dict):
                meeting_notes = summary_data["MeetingNotes"]
                if isinstance(meeting_notes.get("sections"), list):
                    # Add section order array to maintain order
                    transformed_data["_section_order"] = []
                    used_keys = set()
                    
                    for index, section in enumerate(meeting_notes["sections"]):
                        if isinstance(section, dict) and "title" in section and "blocks" in section:
                            # Ensure blocks is a list to prevent frontend errors
                            if not isinstance(section.get("blocks"), list):
                                section["blocks"] = []
                                
                            # Convert title to snake_case key
                            base_key = section["title"].lower().replace(" & ", "_").replace(" ", "_")
                            
                            # Handle duplicate section names by adding index
                            key = base_key
                            if key in used_keys:
                                key = f"{base_key}_{index}"
                            
                            used_keys.add(key)
                            transformed_data[key] = section
                            # Only add to _section_order if the section was successfully added
                            transformed_data["_section_order"].append(key)

        response = {
            "status": "processing" if status in ["processing", "pending", "started"] else status,
            "meetingName": summary_data.get("MeetingName") if isinstance(summary_data, dict) else None,
            "meeting_id": meeting_id,
            "start": result.get("start_time"),
            "end": result.get("end_time"),
            "data": transformed_data if status == "completed" else None
        }

        if status == "failed":
            response["status"] = "error"
            response["error"] = result.get("error", "Unknown processing error")
            response["data"] = None
            response["meetingName"] = None
            logger.info(f"Returning failed status with error: {response['error']}")
            return JSONResponse(status_code=400, content=response)

        elif status in ["processing", "pending", "started"]:
            response["data"] = None
            return JSONResponse(status_code=202, content=response)

        elif status == "completed":
            if not summary_data:
                response["status"] = "error"
                response["error"] = "Completed but summary data is missing or invalid"
                response["data"] = None
                response["meetingName"] = None
                return JSONResponse(status_code=500, content=response)
            return JSONResponse(status_code=200, content=response)

        else:
            response["status"] = "error"
            response["error"] = f"Unknown or unexpected status: {status}"
            response["data"] = None
            response["meetingName"] = None
            return JSONResponse(status_code=500, content=response)

    except Exception as e:
        logger.error(f"Error getting summary for {meeting_id}: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "meetingName": None,
                "meeting_id": meeting_id,
                "data": None,
                "start": None,
                "end": None,
                "error": f"Internal server error: {str(e)}"
            }
        )

@app.post("/save-transcript")
async def save_transcript(request: SaveTranscriptRequest):
    """Save transcript segments for a meeting without processing"""
    try:
        logger.info(f"Received save-transcript request for meeting: {request.meeting_title}")
        logger.info(f"Number of transcripts to save: {len(request.transcripts)}")

        # Log first transcript timestamps for debugging
        if request.transcripts:
            first = request.transcripts[0]
            logger.debug(f"First transcript: audio_start_time={first.audio_start_time}, audio_end_time={first.audio_end_time}, duration={first.duration}")

        # Generate a unique meeting ID
        meeting_id = f"meeting-{int(time.time() * 1000)}"

        # Save the meeting with folder path (if provided)
        await db.save_meeting(meeting_id, request.meeting_title, folder_path=request.folder_path)

        # Save each transcript segment with NEW timestamp fields for playback sync
        for transcript in request.transcripts:
            await db.save_meeting_transcript(
                meeting_id=meeting_id,
                transcript=transcript.text,
                timestamp=transcript.timestamp,
                summary="",
                action_items="",
                key_points="",
                # NEW: Recording-relative timestamps for audio-transcript synchronization
                audio_start_time=transcript.audio_start_time,
                audio_end_time=transcript.audio_end_time,
                duration=transcript.duration
            )

        logger.info("Transcripts saved successfully")
        return {"status": "success", "message": "Transcript saved successfully", "meeting_id": meeting_id}
    except Exception as e:
        logger.error(f"Error saving transcript: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-model-config")
async def get_model_config():
    """Get the current model configuration"""
    model_config = await db.get_model_config()
    if model_config:
        api_key = await db.get_api_key(model_config["provider"])
        if api_key != None:
            model_config["apiKey"] = api_key
    return model_config

@app.post("/save-model-config")
async def save_model_config(request: SaveModelConfigRequest):
    """Save the model configuration"""
    await db.save_model_config(request.provider, request.model, request.whisperModel)
    if request.apiKey != None:
        await db.save_api_key(request.apiKey, request.provider)
    return {"status": "success", "message": "Model configuration saved successfully"}  

@app.get("/get-transcript-config")
async def get_transcript_config():
    """Get the current transcript configuration"""
    transcript_config = await db.get_transcript_config()
    if transcript_config:
        transcript_api_key = await db.get_transcript_api_key(transcript_config["provider"])
        if transcript_api_key != None:
            transcript_config["apiKey"] = transcript_api_key
    return transcript_config

@app.post("/save-transcript-config")
async def save_transcript_config(request: SaveTranscriptConfigRequest):
    """Save the transcript configuration"""
    await db.save_transcript_config(request.provider, request.model)
    if request.apiKey != None:
        await db.save_transcript_api_key(request.apiKey, request.provider)
    return {"status": "success", "message": "Transcript configuration saved successfully"}

class GetApiKeyRequest(BaseModel):
    provider: str

@app.post("/get-api-key")
async def get_api_key(request: GetApiKeyRequest):
    try:
        return await db.get_api_key(request.provider)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-transcript-api-key")
async def get_transcript_api_key(request: GetApiKeyRequest):
    try:
        return await db.get_transcript_api_key(request.provider)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MeetingSummaryUpdate(BaseModel):
    meeting_id: str
    summary: dict

@app.post("/save-meeting-summary")
async def save_meeting_summary(data: MeetingSummaryUpdate):
    """Save a meeting summary"""
    try:
        await db.update_meeting_summary(data.meeting_id, data.summary)
        return {"message": "Meeting summary saved successfully"}
    except ValueError as ve:
        logger.error(f"Value error saving meeting summary: {str(ve)}")
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error saving meeting summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class SearchRequest(BaseModel):
    query: str

@app.post("/search-transcripts")
async def search_transcripts(request: SearchRequest):
    """Search through meeting transcripts for the given query"""
    try:
        results = await db.search_transcripts(request.query)
        return JSONResponse(content=results)
    except Exception as e:
        logger.error(f"Error searching transcripts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------------------------
# Ingest from desktop (authenticated) + audio storage
# ----------------------------------------------------------------------
AUDIO_DIR = os.getenv("AUDIO_DIR", os.path.join(os.path.dirname(__file__), "audio_store"))
os.makedirs(AUDIO_DIR, exist_ok=True)

# meeting_id is server-generated, but validate before using it in a filesystem path
_MEETING_ID_RE = re.compile(r"^[A-Za-z0-9._-]+$")

class IngestSegment(BaseModel):
    text: str
    timestamp: Optional[str] = None
    audio_start_time: Optional[float] = None
    audio_end_time: Optional[float] = None
    duration: Optional[float] = None

class IngestMeetingRequest(BaseModel):
    title: str
    started_at: Optional[str] = None
    source: Optional[str] = "desktop"
    segments: List[IngestSegment]
    summarize: bool = True
    custom_prompt: Optional[str] = "Generate a summary of the meeting transcript."


async def summarize_meeting_background(meeting_id: str, text: str, provider: str,
                                       model_name: str, custom_prompt: str):
    """Background task: summarize an ingested meeting on the server (the VM),
    using the org's configured model. Mirrors process_transcript_background but
    driven by ingested segments rather than a raw request."""
    try:
        if provider in ["claude", "groq", "openai"]:
            api_key = await processor.db.get_api_key(provider)
            if not api_key:
                provider_names = {"claude": "Anthropic", "groq": "Groq", "openai": "OpenAI"}
                raise ValueError(f"{provider_names.get(provider, provider)} API key not configured")

        _, all_json_data = await processor.process_transcript(
            text=text,
            model=provider,
            model_name=model_name,
            custom_prompt=custom_prompt,
        )
        final_summary = aggregate_chunk_summaries(all_json_data)

        if final_summary["MeetingName"]:
            await processor.db.update_meeting_name(meeting_id, final_summary["MeetingName"])

        if all_json_data:
            await processor.db.update_process(meeting_id, status="completed", result=json.dumps(final_summary))
            await db.set_meeting_status(meeting_id, "ready")
            logger.info(f"Ingest summarize completed for meeting {meeting_id}")
        else:
            await processor.db.update_process(meeting_id, status="failed", error="No chunks were processed")
            await db.set_meeting_status(meeting_id, "failed")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Ingest summarize failed for {meeting_id}: {error_msg}", exc_info=True)
        try:
            await processor.db.update_process(meeting_id, status="failed", error=error_msg)
            await db.set_meeting_status(meeting_id, "failed")
        except Exception as db_e:
            logger.error(f"Failed to mark meeting {meeting_id} failed: {db_e}", exc_info=True)


@app.post("/api/meetings/ingest")
async def ingest_meeting(
    req: IngestMeetingRequest,
    background_tasks: BackgroundTasks,
    user: CurrentUser = Depends(get_current_user),
):
    """Create a meeting owned by the current user from desktop-supplied segments,
    and (optionally) kick off server-side summarization."""
    try:
        meeting_id = f"meeting-{int(time.time() * 1000)}"
        await db.create_owned_meeting(
            meeting_id, req.title, owner_id=user.id,
            source=req.source or "desktop", started_at=req.started_at,
        )
        await db.add_meeting_segments(meeting_id, [s.dict() for s in req.segments])

        will_summarize = False
        if req.summarize and req.segments:
            full_text = "\n".join(s.text for s in req.segments if s.text).strip()
            model_config = await db.get_model_config()
            if full_text and model_config:
                await processor.db.create_process(meeting_id)  # summary_processes row -> PENDING
                background_tasks.add_task(
                    summarize_meeting_background,
                    meeting_id, full_text,
                    model_config["provider"], model_config["model"],
                    req.custom_prompt,
                )
                will_summarize = True

        if not will_summarize:
            # Nothing to summarize (no text or no model configured) -> immediately ready
            await db.set_meeting_status(meeting_id, "ready")

        return {
            "meeting_id": meeting_id,
            "status": "processing" if will_summarize else "ready",
        }
    except Exception as e:
        logger.error(f"Error ingesting meeting: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def _require_meeting_access(meeting_id: str, user: CurrentUser, write: bool = False) -> dict:
    """Resolve a user's access to a meeting: owner OR share grant OR all-org
    (admins get owner-level access). Returns the meeting info dict with an added
    `role` key ('owner' | 'editor' | 'viewer'). Raises 400/404/403 as needed.
    When write=True, viewers are rejected (they have read-only access)."""
    if not _MEETING_ID_RE.match(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting id")
    info = await db.get_meeting_access_info(meeting_id)
    if info is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if user.is_admin or info["owner_id"] == user.id:
        role = "owner"
    else:
        role = await db.get_share_role(meeting_id, user.id)

    if role is None:
        raise HTTPException(status_code=403, detail="You do not have access to this meeting")
    if write and role not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="You have view-only access to this meeting")

    info["role"] = role
    return info


@app.post("/api/meetings/{meeting_id}/audio")
async def upload_meeting_audio(
    meeting_id: str,
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
):
    """Upload the meeting's audio recording to the shared audio volume."""
    await _require_meeting_access(meeting_id, user, write=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if not re.match(r"^\.[a-z0-9]{1,8}$", ext):
        ext = ".bin"
    dest = os.path.join(AUDIO_DIR, f"{meeting_id}{ext}")
    try:
        with open(dest, "wb") as out:
            shutil.copyfileobj(file.file, out)
    finally:
        await file.close()

    await db.set_meeting_audio(meeting_id, True)
    logger.info(f"Stored audio for meeting {meeting_id} at {dest}")
    return {"status": "ok", "meeting_id": meeting_id}


@app.get("/api/meetings/{meeting_id}/audio")
async def download_meeting_audio(
    meeting_id: str,
    user: CurrentUser = Depends(get_current_user),
):
    """Stream the meeting's audio recording (owner/admin only for now)."""
    await _require_meeting_access(meeting_id, user)
    matches = glob.glob(os.path.join(AUDIO_DIR, f"{meeting_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="No audio for this meeting")
    return FileResponse(matches[0], filename=os.path.basename(matches[0]))


# ----------------------------------------------------------------------
# Sharing (owner-managed grants)
# ----------------------------------------------------------------------
class ShareRequest(BaseModel):
    email: Optional[str] = None       # share with a specific colleague
    all_org: bool = False             # or share with everyone in the org
    role: str = "viewer"              # viewer | editor


async def _require_meeting_owner(meeting_id: str, user: CurrentUser) -> dict:
    """Only the meeting owner (or an admin) may manage its sharing."""
    access = await _require_meeting_access(meeting_id, user)
    if access["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the meeting owner can manage sharing")
    return access


@app.get("/api/meetings/{meeting_id}/shares")
async def list_meeting_shares(meeting_id: str, user: CurrentUser = Depends(get_current_user)):
    """List who a meeting is shared with (owner/admin only)."""
    await _require_meeting_owner(meeting_id, user)
    grants = await db.list_share_grants(meeting_id)
    return {"meeting_id": meeting_id, "shares": grants}


@app.post("/api/meetings/{meeting_id}/share")
async def share_meeting(meeting_id: str, req: ShareRequest,
                        user: CurrentUser = Depends(get_current_user)):
    """Share a meeting with a colleague (by email) or with the whole org."""
    access = await _require_meeting_owner(meeting_id, user)
    if req.role not in ("viewer", "editor"):
        raise HTTPException(status_code=400, detail="role must be 'viewer' or 'editor'")

    if req.all_org:
        grant = await db.upsert_share_grant(
            meeting_id, all_org=True, role=req.role, created_by=user.id,
        )
    elif req.email:
        target = await db.get_user_by_email(req.email.strip().lower())
        if not target:
            raise HTTPException(
                status_code=404,
                detail="That person hasn't signed in yet — ask them to sign in once, then share.",
            )
        if target["id"] == access["owner_id"]:
            raise HTTPException(status_code=400, detail="That user already owns this meeting")
        grant = await db.upsert_share_grant(
            meeting_id, grantee_id=target["id"], role=req.role, created_by=user.id,
        )
    else:
        raise HTTPException(status_code=400, detail="Provide an email or set all_org")

    return {"status": "ok", "grant": grant}


@app.delete("/api/meetings/{meeting_id}/share/{grant_id}")
async def revoke_meeting_share(meeting_id: str, grant_id: str,
                               user: CurrentUser = Depends(get_current_user)):
    """Remove a share grant (owner/admin only)."""
    await _require_meeting_owner(meeting_id, user)
    if not await db.revoke_share_grant(meeting_id, grant_id):
        raise HTTPException(status_code=404, detail="Grant not found")
    return {"status": "ok"}


# ----------------------------------------------------------------------
# Read APIs for the Library + Detail screens (access-filtered)
# ----------------------------------------------------------------------
def _parse_summary_result(raw: Optional[str]) -> Optional[dict]:
    """Summary results are stored as a JSON string (occasionally double-encoded)."""
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, str):
            parsed = json.loads(parsed)
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, TypeError):
        return None


@app.get("/api/meetings")
async def list_my_meetings(
    project_id: Optional[str] = None,
    unassigned: bool = False,
    user: CurrentUser = Depends(get_current_user),
):
    """List meetings the current user can access (owned, shared, or all-org),
    each annotated with the user's role. Feeds the Library screen.

    Optional filters:
      - unassigned=true  -> only meetings not yet filed under a project (triage list)
      - project_id=<id>  -> only meetings filed under that project
    """
    meetings = await db.list_accessible_meetings(user.id, user.is_admin)
    result = []
    for m in meetings:
        if unassigned and m.get("project_id"):
            continue
        if project_id and m.get("project_id") != project_id:
            continue
        is_owner = user.is_admin or m["owner_id"] == user.id
        role = "owner" if is_owner else (await db.get_share_role(m["id"], user.id) or "viewer")
        result.append({
            "id": m["id"],
            "title": m["title"],
            "created_at": m["created_at"],
            "status": m["status"],
            "owner_id": m["owner_id"],
            "is_owner": is_owner,
            "role": role,
            "audio_uploaded": m["audio_uploaded"],
            "project_id": m.get("project_id"),
        })
    return {"meetings": result}


@app.get("/api/meetings/{meeting_id}")
async def get_meeting_detail(meeting_id: str, user: CurrentUser = Depends(get_current_user)):
    """Full meeting detail: metadata + role + transcript + structured summary.
    Feeds the Detail screen. Access-filtered (owner/grant/all-org)."""
    access = await _require_meeting_access(meeting_id, user)
    meeting = await db.get_meeting(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    summary_row = await db.get_meeting_summary(meeting_id)
    summary_data = None
    summary_status = "none"
    if summary_row:
        summary_status = (summary_row.get("status") or "none").lower()
        summary_data = _parse_summary_result(summary_row.get("result"))

    return {
        "id": meeting_id,
        "title": meeting["title"],
        "created_at": meeting["created_at"],
        "updated_at": meeting["updated_at"],
        "status": access["status"],
        "owner_id": access["owner_id"],
        "role": access["role"],
        "audio_uploaded": access["audio_uploaded"],
        "project_id": access.get("project_id"),
        "transcripts": meeting["transcripts"],
        "summary_status": summary_status,
        "summary": summary_data,
    }


# ----------------------------------------------------------------------
# Projects (filing a meeting series) + Unassigned triage
# ----------------------------------------------------------------------
class CreateProjectRequest(BaseModel):
    name: str


class AssignProjectRequest(BaseModel):
    # The project to file the meeting under. Send null to move it back to
    # Unassigned (the triage list).
    project_id: Optional[str] = None


async def _require_project_access(project_id: str, user: CurrentUser) -> dict:
    """Resolve a user's access to a project: owner or admin. Raises 404/403."""
    project = await db.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if not (user.is_admin or project["owner_id"] == user.id):
        raise HTTPException(status_code=403, detail="You do not have access to this project")
    return project


@app.get("/api/projects")
async def list_projects(user: CurrentUser = Depends(get_current_user)):
    """List the current user's projects (admins see all), each with a count of
    how many meetings they can access are filed under it. Feeds the Library."""
    projects = await db.list_projects(user.id, user.is_admin)
    return {"projects": projects}


@app.post("/api/projects")
async def create_project(req: CreateProjectRequest, user: CurrentUser = Depends(get_current_user)):
    """Create a project owned by the current user."""
    name = (req.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty")
    if len(name) > 200:
        raise HTTPException(status_code=400, detail="Project name too long (max 200 chars)")
    project = await db.create_project(name=name, owner_id=user.id)
    return {"status": "ok", "project": project}


@app.post("/api/meetings/{meeting_id}/project")
async def assign_meeting_project(
    meeting_id: str,
    req: AssignProjectRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """File a meeting under a project, or move it back to Unassigned.

    Requires write access to the meeting (owner/editor/admin). When a project
    is given, the caller must also have access to that project."""
    await _require_meeting_access(meeting_id, user, write=True)

    if req.project_id:
        await _require_project_access(req.project_id, user)

    await db.set_meeting_project(meeting_id, req.project_id)
    return {"status": "ok", "meeting_id": meeting_id, "project_id": req.project_id}


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on API shutdown"""
    logger.info("API shutting down, cleaning up resources")
    try:
        processor.cleanup()
        logger.info("Successfully cleaned up resources")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}", exc_info=True)

if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    uvicorn.run("main:app", host="0.0.0.0", port=5167, reload=True)
