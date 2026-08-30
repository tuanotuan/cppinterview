// Day 40: atomic_ref, Atomic Wait/Notify, and Atomic Smart Pointers
#include <atomic>
#include <iostream>
#include <memory>
#include <thread>

int main() {
    int ordinary = 10;
    std::atomic_ref<int> reference{ordinary};
    reference.fetch_add(5);

    std::atomic<int> state{0};
    std::atomic<int> observed{0};
    {
        std::jthread waiter{[&] {
            state.wait(0);
            observed.store(state.load());
        }};
        state.store(1);
        state.notify_one();
    }

    std::atomic<std::shared_ptr<int>> current;
    current.store(std::make_shared<int>(42));

    std::cout << "atomic_ref value = " << ordinary << '\n';
    std::cout << "wait observed = " << observed.load() << '\n';
    std::cout << "shared value = " << *current.load() << '\n';
}
