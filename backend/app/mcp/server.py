import asyncio
from mcp.server.fastmcp import FastMCP
from app.mcp.tools import MCPTools

# Inițializare Server MCP
mcp_server = FastMCP("MedicationAssistantMCP")

@mcp_server.tool()
async def lookup_leaflet_rag(query: str, user_id: str) -> str:
    """Căutare RAG în prospectele medicale oficiale."""
    res = await MCPTools.tool_rag_search(query, user_id)
    return str(res)

@mcp_server.tool()
async def add_medication_action(drug_name: str, user_id: str) -> str:
    """Acțiune: Adaugă un medicament în lista de tratament a pacientului."""
    res = await MCPTools.tool_add_medication(drug_name, user_id)
    return str(res)

@mcp_server.tool()
async def check_drug_interactions(user_id: str) -> str:
    """Verifică interacțiunile dintre medicamentele din lista pacientului."""
    res = await MCPTools.tool_check_interactions(user_id)
    return str(res)

if __name__ == "__main__":
    mcp_server.run()