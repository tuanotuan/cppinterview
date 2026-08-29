#include <atomic>
#include <iostream>
#include <mutex>
#include <thread>

int main() {
    std::mutex mutex;
    int protected_total = 0;
    std::atomic<int> events{0};

    auto worker = [&](int amount) {
        {
            std::lock_guard<std::mutex> lock(mutex);
            protected_total += amount;
        }
        events.fetch_add(1, std::memory_order_relaxed);
    };

    std::thread first(worker, 10);
    std::thread second(worker, 20);
    first.join();
    second.join();

    std::cout << "total: " << protected_total << "\n";
    std::cout << "events: " << events.load() << "\n";
}
