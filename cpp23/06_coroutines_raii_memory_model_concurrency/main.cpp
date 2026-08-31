#include <atomic>
#include <iostream>
#include <thread>

int main() {
    std::atomic<int> counter{0};

    {
        std::jthread first([&] {
            for (int i = 0; i < 1000; ++i)
                counter.fetch_add(1, std::memory_order_relaxed);
        });
        std::jthread second([&] {
            for (int i = 0; i < 1000; ++i)
                counter.fetch_add(1, std::memory_order_relaxed);
        });
        // Both jthreads join when this scope ends.
    }

    std::cout << "counter=" << counter.load() << '\n';
}
