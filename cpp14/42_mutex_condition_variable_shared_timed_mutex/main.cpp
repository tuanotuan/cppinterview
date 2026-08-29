#include <condition_variable>
#include <iostream>
#include <mutex>
#include <shared_mutex>
#include <thread>

int main() {
    std::mutex ready_mutex;
    std::condition_variable ready_cv;
    bool ready = false;
    std::shared_timed_mutex data_mutex;
    int value = 0;

    std::thread producer([&] {
        {
            std::unique_lock<std::shared_timed_mutex> write_lock(data_mutex);
            value = 42;
        }
        {
            std::lock_guard<std::mutex> lock(ready_mutex);
            ready = true;
        }
        ready_cv.notify_one();
    });

    std::unique_lock<std::mutex> lock(ready_mutex);
    ready_cv.wait(lock, [&] { return ready; });
    lock.unlock();

    std::shared_lock<std::shared_timed_mutex> read_lock(data_mutex);
    std::cout << "value: " << value << "\n";
    read_lock.unlock();
    producer.join();
}
