import json
from pathlib import Path
import graphify

# 1. Load data
ast_data = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding='utf-8'))
semantic_data = json.loads(Path('graphify-out/.graphify_semantic_core.json').read_text(encoding='utf-8'))
detect_data = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8-sig'))

# 2. Merge
merged_nodes = ast_data.get('nodes', []) + semantic_data.get('nodes', [])
merged_edges = ast_data.get('edges', []) + semantic_data.get('edges', [])
combined = {"nodes": merged_nodes, "edges": merged_edges}

# 3. Build Graph
print("Building graph...")
G = graphify.build_from_json(combined)

# 4. Cluster
print("Clustering communities...")
communities = graphify.cluster(G)
community_labels = {cid: f"Community {cid}" for cid in communities.keys()}

# 5. Analyze
print("Analyzing graph...")
cohesion_scores = graphify.score_all(G, communities)
god_node_list = graphify.god_nodes(G)
surprise_list = graphify.surprising_connections(G)
questions = graphify.suggest_questions(G, communities, community_labels)

# 6. Generate Markdown Report
print("Generating markdown report...")
token_cost = {
    "input": ast_data.get('input_tokens', 0) + semantic_data.get('input_tokens', 0),
    "output": ast_data.get('output_tokens', 0) + semantic_data.get('output_tokens', 0)
}

report_content = graphify.generate(
    G=G,
    communities=communities,
    cohesion_scores=cohesion_scores,
    community_labels=community_labels,
    god_node_list=god_node_list,
    surprise_list=surprise_list,
    detection_result=detect_data,
    token_cost=token_cost,
    root='D:/project/egov-enterprise',
    suggested_questions=questions
)

with open('GRAPH_REPORT.md', 'w', encoding='utf-8') as f:
    f.write(report_content)

# 7. Save final JSON
with open('graphify-out/graph.json', 'w', encoding='utf-8') as f:
    json.dump({'nodes': merged_nodes, 'edges': merged_edges, 'communities': communities}, f, indent=2)

print("Success! Report generated at GRAPH_REPORT.md")
