from mcp.server.fastmcp import FastMCP

from app.mcp.tools import MCPTools

mcp_server = FastMCP("MedicationAssistantMCP")


@mcp_server.tool()
async def lookup_leaflet_rag(query: str, user_id: str) -> str:
    """Search official medication leaflets."""
    res = await MCPTools.tool_rag_search(query, user_id)
    return str(res)


@mcp_server.tool()
async def add_medication_action(drug_name: str, user_id: str) -> str:
    """Add a medication that exists in the leaflet database."""
    res = await MCPTools.tool_add_medication(drug_name, user_id)
    return str(res)


@mcp_server.tool()
async def check_drug_interactions(user_id: str) -> str:
    """Return structured interaction matches and severity."""
    res = await MCPTools.tool_check_interactions(user_id)
    return str(res)


@mcp_server.tool()
async def generate_daily_schedule(user_id: str) -> str:
    """Propose a schedule. Never approve it."""
    res = await MCPTools.tool_generate_schedule(user_id)
    return str(res)


if __name__ == "__main__":
    mcp_server.run()
