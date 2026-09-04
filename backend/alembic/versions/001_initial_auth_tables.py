"""initial auth and tenant tables

Revision ID: 001_initial_auth_tables
Revises:
Create Date: 2026-09-04 05:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = "001_initial_auth_tables"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. organizations
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_organizations_id"), "organizations", ["id"], unique=False)

    # 2. owners
    op.create_table(
        "owners",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_owners_id"), "owners", ["id"], unique=False)
    op.create_index(op.f("ix_owners_email"), "owners", ["email"], unique=True)
    op.create_index(op.f("ix_owners_organization_id"), "owners", ["organization_id"], unique=False)

    # 3. widget_configurations
    op.create_table(
        "widget_configurations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("widget_key", sa.String(length=64), nullable=False),
        sa.Column("previous_widget_key", sa.String(length=64), nullable=True),
        sa.Column("grace_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("primary_color", sa.String(length=9), nullable=False, server_default="#4F46E5"),
        sa.Column("bot_display_name", sa.String(length=100), nullable=False, server_default="Support Assistant"),
        sa.Column("welcome_message", sa.String(length=500), nullable=False, server_default="Hi! How can I help you today?"),
        sa.Column("widget_placement", sa.String(length=20), nullable=False, server_default="bottom-right"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_widget_configurations_id"), "widget_configurations", ["id"], unique=False)
    op.create_index(op.f("ix_widget_configurations_organization_id"), "widget_configurations", ["organization_id"], unique=True)
    op.create_index(op.f("ix_widget_configurations_widget_key"), "widget_configurations", ["widget_key"], unique=True)
    op.create_index(op.f("ix_widget_configurations_previous_widget_key"), "widget_configurations", ["previous_widget_key"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_widget_configurations_previous_widget_key"), table_name="widget_configurations")
    op.drop_index(op.f("ix_widget_configurations_widget_key"), table_name="widget_configurations")
    op.drop_index(op.f("ix_widget_configurations_organization_id"), table_name="widget_configurations")
    op.drop_index(op.f("ix_widget_configurations_id"), table_name="widget_configurations")
    op.drop_table("widget_configurations")

    op.drop_index(op.f("ix_owners_organization_id"), table_name="owners")
    op.drop_index(op.f("ix_owners_email"), table_name="owners")
    op.drop_index(op.f("ix_owners_id"), table_name="owners")
    op.drop_table("owners")

    op.drop_index(op.f("ix_organizations_id"), table_name="organizations")
    op.drop_table("organizations")
