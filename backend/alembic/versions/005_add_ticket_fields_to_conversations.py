"""add ticket_status and visitor_email to conversations and citations to messages

Revision ID: 005_add_ticket_fields
Revises: 004_widget_allowed_origins
Create Date: 2026-09-06 02:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "005_add_ticket_fields"
down_revision: Union[str, None] = "004_widget_allowed_origins"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add ticket columns to conversations table
    op.add_column(
        "conversations",
        sa.Column("ticket_status", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "conversations",
        sa.Column("visitor_email", sa.String(length=255), nullable=True),
    )
    op.create_index(
        op.f("ix_conversations_ticket_status"),
        "conversations",
        ["ticket_status"],
        unique=False,
    )

    # 2. Add citations JSON column to messages table
    op.add_column(
        "messages",
        sa.Column("citations", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("messages", "citations")
    op.drop_index(op.f("ix_conversations_ticket_status"), table_name="conversations")
    op.drop_column("conversations", "visitor_email")
    op.drop_column("conversations", "ticket_status")
