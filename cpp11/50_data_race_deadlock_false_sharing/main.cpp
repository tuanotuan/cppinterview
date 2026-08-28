#include <atomic>
#include <iostream>
#include <mutex>
#include <thread>

struct alignas(64) PaddedCounter {
    PaddedCounter() : value(0) {}
    std::atomic<int> value;
};

int main() {
    PaddedCounter left;
    PaddedCounter right; // padding reduces likely cache-line sharing

    std::thread first([&] {
        for (int i = 0; i < 1000; ++i) {
            left.value.fetch_add(1, std::memory_order_relaxed);
        }
    });
    std::thread second([&] {
        for (int i = 0; i < 1000; ++i) {
            right.value.fetch_add(1, std::memory_order_relaxed);
        }
    });

    std::mutex a;
    std::mutex b;
    std::lock(a, b); // deadlock-aware acquisition
    std::lock_guard<std::mutex> lock_a(a, std::adopt_lock);
    std::lock_guard<std::mutex> lock_b(b, std::adopt_lock);

    first.join();
    second.join();
    std::cout << left.value << ',' << right.value << '\n';
}
