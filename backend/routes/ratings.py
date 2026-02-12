from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from models.rating import DayRating, SurveyQuestion, SurveyResponse
from dependencies import get_current_user, require_admin
import uuid
import logging

router = APIRouter(prefix="/ratings", tags=["ratings"])
survey_router = APIRouter(prefix="/survey", tags=["survey"])
logger = logging.getLogger(__name__)

db = None

def init_db(database):
    global db
    db = database

# Ratings
@router.post("")
async def create_or_update_rating(
    rating: int,
    date: str,
    notes: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    existing = await db.day_ratings.find_one({"user_id": user["id"], "date": date})
    
    if existing:
        await db.day_ratings.update_one(
            {"id": existing["id"]},
            {"$set": {"rating": rating, "notes": notes}}
        )
        return {**existing, "rating": rating, "notes": notes}
    
    rating_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": date,
        "rating": rating,
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.day_ratings.insert_one(rating_dict)
    rating_dict.pop('_id', None)
    
    # Fetch clean data without _id
    created_rating = await db.day_ratings.find_one({"id": rating_dict["id"]}, {"_id": 0})
    return created_rating

@router.get("")
async def get_ratings(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["id"]}
    
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}
    
    ratings = await db.day_ratings.find(query, {"_id": 0}).to_list(100)
    return ratings

@router.get("/{date}")
async def get_rating_by_date(date: str, user: dict = Depends(get_current_user)):
    rating = await db.day_ratings.find_one({"user_id": user["id"], "date": date}, {"_id": 0})
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    return rating

# Survey Questions
@survey_router.get("/questions")
async def get_survey_questions(user: dict = Depends(get_current_user)):
    questions = await db.survey_questions.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return questions

@survey_router.post("/questions")
async def create_survey_question(question_data: Dict[str, Any] = Body(...), admin: dict = Depends(require_admin)):
    # Get max order
    existing = await db.survey_questions.find({}, {"_id": 0}).sort("order", -1).to_list(1)
    max_order = existing[0]["order"] if existing else 0
    
    question_dict = {
        "id": str(uuid.uuid4()),
        "question": question_data.get("question", ""),
        "question_type": question_data.get("question_type", "text"),
        "options": question_data.get("options"),
        "order": max_order + 1,
        "is_active": True
    }
    
    await db.survey_questions.insert_one(question_dict)
    
    # Fetch clean data without _id
    created_question = await db.survey_questions.find_one({"id": question_dict["id"]}, {"_id": 0})
    return created_question

@survey_router.put("/questions/{question_id}")
async def update_survey_question(
    question_id: str,
    question_data: Dict[str, Any] = Body(...),
    admin: dict = Depends(require_admin)
):
    question = await db.survey_questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db.survey_questions.update_one({"id": question_id}, {"$set": question_data})
    updated = await db.survey_questions.find_one({"id": question_id}, {"_id": 0})
    return updated

@survey_router.delete("/questions/{question_id}")
async def delete_survey_question(question_id: str, admin: dict = Depends(require_admin)):
    result = await db.survey_questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted"}

# Survey Responses
@survey_router.post("/responses")
async def create_survey_response(
    response_data: Dict[str, Any] = Body(...),
    user: dict = Depends(get_current_user)
):
    date = response_data.get("date")
    responses = response_data.get("responses", {})
    
    # Check if response already exists
    existing = await db.survey_responses.find_one({"user_id": user["id"], "date": date})
    
    if existing:
        await db.survey_responses.update_one(
            {"id": existing["id"]},
            {"$set": {"responses": responses}}
        )
        return {**existing, "responses": responses}
    
    response_dict = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": date,
        "responses": responses,
        "ai_summary": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.survey_responses.insert_one(response_dict)
    
    # Fetch clean data without _id
    created_response = await db.survey_responses.find_one({"id": response_dict["id"]}, {"_id": 0})
    return created_response

@survey_router.get("/responses")
async def get_survey_responses(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["id"]}
    
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    responses = await db.survey_responses.find(query, {"_id": 0}).to_list(100)
    return responses

@survey_router.get("/responses/{date}")
async def get_survey_response_by_date(date: str, user: dict = Depends(get_current_user)):
    response = await db.survey_responses.find_one({"user_id": user["id"], "date": date}, {"_id": 0})
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    return response
