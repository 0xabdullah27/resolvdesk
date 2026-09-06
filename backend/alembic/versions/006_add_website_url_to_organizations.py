"""add website_url to organizations

Revision ID: 006_add_website_url
Revises: 005_add_ticket_fields
Create Date: 2026-09-06 05:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "006_add_website_url"
down_revision: Union[str, None] = "005_add_ticket_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("website_url", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "website_url")
