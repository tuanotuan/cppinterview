#include <array>
#include <atomic>
#include <cstddef>
#include <iostream>
#include <thread>

class SpscQueue {
public:
    SpscQueue() : head_(0), tail_(0) {}

    bool push(int value) {
        const std::size_t tail = tail_.load(std::memory_order_relaxed);
        const std::size_t next = (tail + 1) % data_.size();
        if (next == head_.load(std::memory_order_acquire)) {
            return false;
        }
        data_[tail] = value;
        tail_.store(next, std::memory_order_release);
        return true;
    }

    bool pop(int& value) {
        const std::size_t head = head_.load(std::memory_order_relaxed);
        if (head == tail_.load(std::memory_order_acquire)) {
            return false;
        }
        value = data_[head];
        head_.store((head + 1) % data_.size(), std::memory_order_release);
        return true;
    }

private:
    std::array<int, 4> data_;
    std::atomic<std::size_t> head_;
    std::atomic<std::size_t> tail_;
};

int main() {
    SpscQueue queue;
    std::thread producer([&] {
        for (int value = 1; value <= 3; ++value) {
            while (!queue.push(value)) {}
        }
    });
    std::thread consumer([&] {
        for (int count = 0; count < 3;) {
            int value = 0;
            if (queue.pop(value)) {
                std::cout << value << (count == 2 ? '\n' : ' ');
                ++count;
            }
        }
    });
    producer.join();
    consumer.join();
}
