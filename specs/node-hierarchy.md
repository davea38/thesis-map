# Node Hierarchy

Nodes form an arbitrary-depth tree rooted at the thesis.

## Structure

- The **root node** is the thesis statement
- Any node can have **child nodes** representing evidence or sub-arguments relevant to their parent
- There is **no depth limit** — the tree can be as deep as needed
- Each child node is itself a full node with statement, body, strength, polarity, and its own potential children

## Relationships

- Every non-root node has exactly one parent
- A parent can have zero or more children
- Children represent evidence supporting or opposing their parent claim

## Deletion

- Deleting a node **deletes its entire subtree** (all descendants)
- Deleting the root node is equivalent to deleting the entire map (handled via map management)
