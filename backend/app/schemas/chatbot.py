from pydantic import BaseModel


class ChatbotQuestion(BaseModel):
    question: str
