#include <condition_variable>
#include <iostream>
#include <mutex>
#include <thread>

int main() {
    std::mutex mutex;
    std::condition_variable ready_cv;
    bool ready = false;
    int value = 0;

    std::thread consumer([&] {
        std::unique_lock<std::mutex> lock(mutex);
        ready_cv.wait(lock, [&] { return ready; });
        std::cout << "value=" << value << '\n';
    });

    std::thread producer([&] {
        {
            std::lock_guard<std::mutex> lock(mutex);
            value = 42;
            ready = true;
        }
        ready_cv.notify_one();
    });

    producer.join();
    consumer.join();
}
