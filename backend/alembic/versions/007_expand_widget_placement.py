"""expand widget_placement column length

Revision ID: 007_expand_widget_placement
Revises: 006_add_website_url
Create Date: 2026-09-08 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "007_expand_widget_placement"
down_revision: Union[str, None] = "006_add_website_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "widget_configurations",
        "widget_placement",
        type_=sa.String(length=64),
        existing_type=sa.String(length=20),
        existing_nullable=False,
        existing_server_default="bottom-right",
    )


def downgrade() -> None:
    op.alter_column(
        "widget_configurations",
        "widget_placement",
        type_=sa.String(length=20),
        existing_type=sa.String(length=64),
        existing_nullable=False,
        existing_server_default="bottom-right",
    )
