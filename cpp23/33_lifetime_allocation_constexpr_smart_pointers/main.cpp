#include <cstddef>
#include <iostream>
#include <memory>
#include <version>

int main() {
#if defined(__cpp_lib_constexpr_memory) && \
    __cpp_lib_constexpr_memory >= 202202L
    constexpr int owned = [] {
        auto value = std::make_unique<int>(7);
        return *value;
    }();
    static_assert(owned == 7);
    std::cout << "constexpr owner=" << owned << '\n';
#else
    std::cout << "constexpr smart pointers unavailable\n";
#endif

#if defined(__cpp_lib_allocate_at_least)
    std::allocator<int> allocator;
    auto block = allocator.allocate_at_least(2);
    std::construct_at(block.ptr, 9);
    std::cout << "allocated value=" << *block.ptr << '\n';
    std::destroy_at(block.ptr);
    allocator.deallocate(block.ptr, block.count);
#else
    std::cout << "allocate_at_least unavailable\n";
#endif

#if defined(__cpp_lib_start_lifetime_as)
    alignas(int) std::byte storage[sizeof(int)]{};
    int* value = std::start_lifetime_as<int>(storage);
    *value = 11;
    std::cout << "started value=" << *value << '\n';
#else
    std::cout << "start_lifetime_as unavailable\n";
#endif
}
