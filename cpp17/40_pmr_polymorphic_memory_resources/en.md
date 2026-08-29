# Day 40 — std::pmr and Polymorphic Memory Resources

## 1. Problem It Solves

Allocator types normally become part of a container's static type, making runtime allocation-policy changes awkward. C++17 polymorphic allocators route allocation through a runtime `memory_resource` interface.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know allocators, alignment, object lifetime, container allocation, and stack-backed buffers.

## 3. Core Idea

Containers in `std::pmr` use `polymorphic_allocator` and point to a resource. `monotonic_buffer_resource` serves allocations from a buffer and releases them together, trading individual deallocation for cheap bulk lifetime.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
std::byte buffer[1024];
std::pmr::monotonic_buffer_resource arena{buffer, sizeof buffer};
std::pmr::vector<int> values{&arena};
```

## 5. How It Works

1. A monotonic resource receives a fixed local buffer, and a PMR vector is explicitly associated with that resource.
2. The vector's dynamic storage comes from the arena when space permits; destruction ends elements before the resource releases storage in bulk.
3. The program prints `size: 4` and `sum: 10`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- A container must not outlive its resource, and monotonic growth is unsuitable when long-lived workloads require meaningful individual reclamation.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when many related short-lived allocations share a clear arena lifetime and profiling shows allocation overhead.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The buffer, resource, and vector are declared in lifetime order so destruction occurs safely in reverse order.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- PMR separates container algorithms from runtime allocation policy, but resource lifetime becomes an explicit dependency.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does std::pmr and Polymorphic Memory Resources address?
2. Medium — Which object must outlive the PMR vector?
3. Hard — What happens when the initial monotonic buffer is exhausted and an upstream resource exists?
