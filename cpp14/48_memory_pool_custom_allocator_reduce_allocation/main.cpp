#include <array>
#include <cstddef>
#include <iostream>
#include <new>
#include <type_traits>
#include <utility>

template <class T, std::size_t Capacity>
class FixedPool {
    using Slot = typename std::aligned_storage<sizeof(T), alignof(T)>::type;
public:
    T* create(T value) {
        for (std::size_t i = 0; i < Capacity; ++i) {
            if (!used_[i]) {
                T* object = new (&storage_[i]) T(std::move(value));
                used_[i] = true;
                return object;
            }
        }
        throw std::bad_alloc{};
    }

    void destroy(T* object) noexcept {
        for (std::size_t i = 0; i < Capacity; ++i) {
            if (used_[i] &&
                static_cast<void*>(&storage_[i]) == static_cast<void*>(object)) {
                object->~T();
                used_[i] = false;
                return;
            }
        }
    }

private:
    std::array<Slot, Capacity> storage_{};
    std::array<bool, Capacity> used_{};
};

int main() {
    FixedPool<int, 2> pool;
    int* first = pool.create(10);
    int* second = pool.create(20);
    std::cout << "values: " << *first << ", " << *second << "\n";
    pool.destroy(first);
    pool.destroy(second);
}
