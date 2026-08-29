#include <atomic>
#include <iostream>
#include <thread>

int main() {
    int data = 0;
    std::atomic<bool> ready{false};

    std::thread producer([&] {
        data = 42;
        ready.store(true, std::memory_order_release);
    });

    std::thread consumer([&] {
        while (!ready.load(std::memory_order_acquire)) {
            std::this_thread::yield();
        }
        std::cout << "data: " << data << "\n";
    });

    producer.join();
    consumer.join();
}
