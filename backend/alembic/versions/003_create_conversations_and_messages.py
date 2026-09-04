"""create conversations and messages tables

Revision ID: 003_create_conversations_and_messages
Revises: 002_create_documents_table
Create Date: 2026-09-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003_create_chat_tables"
down_revision: Union[str, None] = "002_create_documents_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Conversations table
    op.create_table(
        "conversations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("is_escalated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_conversations_id"), "conversations", ["id"], unique=False)
    op.create_index(op.f("ix_conversations_organization_id"), "conversations", ["organization_id"], unique=False)
    op.create_index(op.f("ix_conversations_updated_at"), "conversations", ["updated_at"], unique=False)

    # 2. Messages table
    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_messages_id"), "messages", ["id"], unique=False)
    op.create_index(op.f("ix_messages_conversation_id"), "messages", ["conversation_id"], unique=False)
    op.create_index(
        "ix_messages_conv_created",
        "messages",
        ["conversation_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_messages_conv_created", table_name="messages")
    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_id"), table_name="messages")
    op.drop_table("messages")

    op.drop_index(op.f("ix_conversations_updated_at"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_organization_id"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_id"), table_name="conversations")
    op.drop_table("conversations")
