#include <atomic>
#include <iostream>
#include <thread>

void increment(std::atomic<int>& counter) {
    for (int i = 0; i < 1000; ++i) {
        int expected = counter.load(std::memory_order_relaxed);
        while (!counter.compare_exchange_weak(
            expected, expected + 1,
            std::memory_order_relaxed,
            std::memory_order_relaxed)) {
            // expected is refreshed after each failed comparison
        }
    }
}

int main() {
    std::atomic<int> counter{0};
    std::thread first(increment, std::ref(counter));
    std::thread second(increment, std::ref(counter));
    first.join();
    second.join();
    std::cout << "counter: " << counter.load() << '\n';
}
