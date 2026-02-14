# Node Hierarchy

Nodes form an arbitrary-depth tree rooted at the thesis.

## Structure

- The **root node** is the thesis statement
- Any node can have **child nodes** representing evidence or sub-arguments relevant to their parent
- There is **no depth limit** — the tree can be as deep as needed
- Each child node is itself a full node with statement, body, strength, polarity, tags, and its own potential children

## Relationships

- Every non-root node has exactly one parent
- A parent can have zero or more children
- Children represent evidence supporting or opposing their parent claim

## Node Creation

- "Add child" creates a new node under the selected parent
- The new node starts with: **empty statement** (inline edit activates immediately so the user can type), **neutral polarity**, **0% strength**, **no tags**
- The user types the statement directly on the canvas via inline edit

## Sibling Ordering

- Children are ordered by **creation time** (oldest first)
- No manual reordering of siblings for MVP

## Reparenting

- **Not supported for MVP.** Nodes remain under their original parent.
- To move a node, the user must delete it and re-create it under the desired parent.

## Deletion

- Deleting a node **deletes its entire subtree** (all descendants)
- If the node has children, a **confirmation dialog** is shown stating how many descendants will be removed (e.g., "Delete this node and its 12 descendants?")
- Deleting a leaf node (no children) also shows a confirmation dialog
- Deleting the root node is equivalent to deleting the entire map (handled via map management)
