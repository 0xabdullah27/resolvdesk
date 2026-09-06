"""ResolvDesk Repositories Package."""

from app.repos.conversation_repo import ConversationRepository
from app.repos.document_repo import DocumentRepository, document_repo
from app.repos.organization_repo import OrganizationRepo
from app.repos.owner_repo import OwnerRepo
from app.repos.vector_repo import VectorRepository, vector_repo
from app.repos.widget_repo import WidgetRepo

__all__ = [
    "ConversationRepository",
    "DocumentRepository",
    "document_repo",
    "OrganizationRepo",
    "OwnerRepo",
    "VectorRepository",
    "vector_repo",
    "WidgetRepo",
]
