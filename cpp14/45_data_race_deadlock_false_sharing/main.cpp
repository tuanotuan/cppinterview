#include <atomic>
#include <functional>
#include <iostream>
#include <mutex>
#include <thread>

struct alignas(64) Counter {
    std::atomic<int> value{0};
};

int main() {
    std::mutex first_mutex;
    std::mutex second_mutex;
    int left = 0;
    int right = 0;
    Counter first_counter;
    Counter second_counter;

    auto worker = [&](Counter& counter) {
        std::lock(first_mutex, second_mutex);
        std::lock_guard<std::mutex> first(first_mutex, std::adopt_lock);
        std::lock_guard<std::mutex> second(second_mutex, std::adopt_lock);
        ++left;
        ++right;
        counter.value.fetch_add(1, std::memory_order_relaxed);
    };

    std::thread a(worker, std::ref(first_counter));
    std::thread b(worker, std::ref(second_counter));
    a.join();
    b.join();
    std::cout << "totals: " << left << ", " << right << "\n";
    std::cout << "counters: " << first_counter.value.load()
              << ", " << second_counter.value.load() << "\n";
}
