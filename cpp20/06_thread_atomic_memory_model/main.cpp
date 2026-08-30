// Day 6: Threads, Atomics, and the C++ Memory Model
#include <atomic>
#include <iostream>
#include <thread>

int main() {
    std::atomic<int> counter{0};

    auto work = [&counter] {
        for (int i = 0; i < 1000; ++i) {
            counter.fetch_add(1);
        }
    };

    std::thread first{work};
    std::thread second{work};
    first.join();
    second.join();

    std::cout << "counter = " << counter.load() << '\n';
}
