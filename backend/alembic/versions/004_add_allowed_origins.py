"""add allowed_origins to widget_configurations

Revision ID: 004_widget_allowed_origins
Revises: 003_create_chat_tables
Create Date: 2026-09-05 02:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004_widget_allowed_origins"
down_revision: Union[str, None] = "003_create_chat_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "widget_configurations",
        sa.Column("allowed_origins", sa.String(length=500), nullable=False, server_default="*"),
    )


def downgrade() -> None:
    op.drop_column("widget_configurations", "allowed_origins")
