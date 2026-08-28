#include <chrono>
#include <cstddef>
#include <iostream>
#include <new>

class IntPool {
public:
    IntPool() : used_(0) {}

    void* allocate() {
        if (used_ == capacity) {
            throw std::bad_alloc();
        }
        return storage_ + sizeof(int) * used_++;
    }

    void reset() { used_ = 0; }

private:
    static const std::size_t capacity = 100;
    alignas(int) unsigned char storage_[capacity * sizeof(int)];
    std::size_t used_;
};

int main() {
    IntPool pool;
    volatile long long checksum = 0;
    const auto start = std::chrono::steady_clock::now();

    for (int batch = 0; batch < 10; ++batch) {
        for (int i = 0; i < 100; ++i) {
            int* value = new (pool.allocate()) int(batch * 100 + i);
            checksum += *value;
        }
        pool.reset();
    }

    const auto end = std::chrono::steady_clock::now();
    const auto elapsed = end - start;
    std::cout << "checksum=" << checksum << '\n';
    std::cout << "time_captured=" << (elapsed.count() >= 0) << '\n';
}
