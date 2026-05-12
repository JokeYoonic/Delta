from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.core.security import get_current_user
from app.models import User
from app.services import ragflow_service
from app.schemas import RAGQueryRequest, RAGQueryResponse

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/query", response_model=RAGQueryResponse)
async def query_rag(
    data: RAGQueryRequest,
    current_user: User = Depends(get_current_user),
):
    result = await ragflow_service.query(data.question, data.kb_name, data.top_k)
    return RAGQueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        confidence=result["confidence"],
    )


@router.post("/upload")
async def upload_textbook(
    file: UploadFile = File(...),
    kb_name: str = "delta-textbooks",
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith((".pdf", ".docx", ".doc", ".txt", ".md")):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, TXT, MD files are supported")

    file_content = await file.read()
    dataset_id = await ragflow_service.get_or_create_dataset(kb_name)
    result = await ragflow_service.upload_document(dataset_id, file.filename, file_content)

    return {
        "status": "uploaded",
        "filename": file.filename,
        "dataset_id": dataset_id,
        "detail": result,
    }


@router.get("/datasets")
async def list_datasets(current_user: User = Depends(get_current_user)):
    datasets = await ragflow_service.list_datasets()
    return {"datasets": datasets}


@router.get("/datasets/{dataset_id}/documents")
async def list_documents(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
):
    documents = await ragflow_service.list_documents(dataset_id)
    return {"documents": documents}
