# Day 34 — Map/Set Node Handles, extract, and merge

## 1. Problem It Solves

Moving elements between associative containers or changing a map key traditionally required allocation and reconstruction because keys are const through iterators. C++17 exposes detached nodes with ownership-aware handles.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know ordered associative containers, unique keys, allocators, iterator invalidation, and move semantics.

## 3. Core Idea

`extract` removes one node without destroying its stored key and value. A non-empty node handle owns that node, permits key mutation, and can be inserted into a compatible container; `merge` transfers only nodes whose keys can be accepted.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
auto node = source.extract(2);
node.key() = 20;
destination.insert(std::move(node));
destination.merge(source);
```

## 5. How It Works

1. One map node is extracted, its key changes from 2 to 20, and it is inserted into another map.
2. Merging then transfers the remaining non-conflicting source node while preserving node-owned values.
3. The program prints `destination: 1=one 3=three 20=two` and an empty source, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Insertion can fail because of a duplicate key; the returned insertion result may still own the node and must not be ignored.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when associative nodes must move or keys must change while avoiding value reconstruction.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

All containers share default compatible allocators. Iterating afterward reveals sorted key order and verifies which source nodes moved.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Node handles make temporary node ownership explicit; always inspect insertion and duplicate-key outcomes.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Map/Set Node Handles, extract, and merge address?
2. Medium — Which keys remain in the source after the successful merge?
3. Hard — How do allocator compatibility and duplicate keys affect node transfer?
