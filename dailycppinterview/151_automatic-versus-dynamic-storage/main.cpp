// Real-World C++ Interviews Q151: What is the difference between stack memory and heap memory?
// Key: The C++ standard specifies storage durations rather than requiring physical stacks or
// heaps. Automatic objects normally live until their scope exits and are destroyed
// automatically; dynamically allocated objects live until their owning operation releases them.
// Automatic allocation is usually cheap and bounded by thread stack space, while dynamic
// allocation is more flexible but has allocator cost and lifetime risk, so production C++
// normally manages it through RAII containers and smart pointers rather than raw `new` and
// `delete`.
#include <iostream>
#include <memory>

int main() {
    int automatic = 10;
    auto dynamic = std::make_unique<int>(20);
    std::cout << automatic + *dynamic << std::endl;
}
