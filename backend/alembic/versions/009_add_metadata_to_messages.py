"""add metadata JSON column to messages table

Revision ID: 009_add_metadata_to_messages
Revises: 008_owner_role_audit_logs
Create Date: 2026-09-10 22:58:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "009_add_metadata_to_messages"
down_revision: Union[str, None] = "008_owner_role_audit_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column("metadata", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("messages", "metadata")
