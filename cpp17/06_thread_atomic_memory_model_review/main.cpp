#include <atomic>
#include <iostream>
#include <thread>

int main() {
    int payload = 0;
    std::atomic<bool> ready{false};

    std::thread producer([&] {
        payload = 42;
        ready.store(true, std::memory_order_release);
    });
    std::thread consumer([&] {
        while (!ready.load(std::memory_order_acquire)) {
            std::this_thread::yield();
        }
        std::cout << "payload: " << payload << '\n';
    });
    producer.join();
    consumer.join();
}
