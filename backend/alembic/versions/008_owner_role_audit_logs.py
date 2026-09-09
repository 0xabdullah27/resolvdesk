"""add owner role and admin audit logs

Revision ID: 008_add_owner_role_and_audit_logs
Revises: 007_expand_widget_placement
Create Date: 2026-09-09 04:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "008_owner_role_audit_logs"
down_revision: Union[str, None] = "007_expand_widget_placement"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add role column to owners table with default 'owner'
    op.add_column(
        "owners",
        sa.Column(
            "role",
            sa.String(length=20),
            nullable=False,
            server_default="owner",
        ),
    )
    op.create_index("ix_owners_role", "owners", ["role"], unique=False)

    # 2. Create admin_audit_logs table
    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column("target_user_id", sa.Uuid(), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["admin_id"], ["owners.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_user_id"], ["owners.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_audit_logs_id", "admin_audit_logs", ["id"], unique=False)
    op.create_index("ix_admin_audit_logs_admin_id", "admin_audit_logs", ["admin_id"], unique=False)
    op.create_index("ix_admin_audit_logs_target_user_id", "admin_audit_logs", ["target_user_id"], unique=False)
    op.create_index("ix_admin_audit_logs_action", "admin_audit_logs", ["action"], unique=False)
    op.create_index("ix_admin_audit_logs_created_at", "admin_audit_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_admin_audit_logs_created_at", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_action", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_target_user_id", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_admin_id", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_id", table_name="admin_audit_logs")
    op.drop_table("admin_audit_logs")

    op.drop_index("ix_owners_role", table_name="owners")
    op.drop_column("owners", "role")
