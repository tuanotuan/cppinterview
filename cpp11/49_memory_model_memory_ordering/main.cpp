#include <atomic>
#include <iostream>
#include <thread>

int main() {
    int payload = 0;
    std::atomic<bool> ready(false);

    std::thread writer([&] {
        payload = 42;
        ready.store(true, std::memory_order_release);
    });

    std::thread reader([&] {
        while (!ready.load(std::memory_order_acquire)) {
        }
        std::cout << "payload=" << payload << '\n';
    });

    writer.join();
    reader.join();
}
