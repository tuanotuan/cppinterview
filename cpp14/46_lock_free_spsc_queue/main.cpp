#include <array>
#include <atomic>
#include <cstddef>
#include <iostream>
#include <thread>

template <class T, std::size_t Capacity>
class SpscQueue {
public:
    bool push(const T& value) {
        const auto tail = tail_.load(std::memory_order_relaxed);
        const auto next = (tail + 1) % Capacity;
        if (next == head_.load(std::memory_order_acquire)) return false;
        buffer_[tail] = value;
        tail_.store(next, std::memory_order_release);
        return true;
    }

    bool pop(T& value) {
        const auto head = head_.load(std::memory_order_relaxed);
        if (head == tail_.load(std::memory_order_acquire)) return false;
        value = buffer_[head];
        head_.store((head + 1) % Capacity, std::memory_order_release);
        return true;
    }

private:
    std::array<T, Capacity> buffer_{};
    std::atomic<std::size_t> head_{0};
    std::atomic<std::size_t> tail_{0};
};

int main() {
    SpscQueue<int, 4> queue;
    const std::array<int, 3> sent{{10, 20, 30}};
    std::array<int, 3> received{};

    std::thread producer([&] {
        for (int value : sent)
            while (!queue.push(value)) std::this_thread::yield();
    });
    std::thread consumer([&] {
        for (int& value : received)
            while (!queue.pop(value)) std::this_thread::yield();
    });

    producer.join();
    consumer.join();
    std::cout << "received:";
    for (int value : received) std::cout << ' ' << value;
    std::cout << "\n";
}
