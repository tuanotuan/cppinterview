#include <future>
#include <iostream>
#include <thread>
#include <utility>

int main() {
    std::promise<int> promise;
    auto first = promise.get_future();

    std::thread producer([p = std::move(promise)]() mutable {
        p.set_value(6);
    });

    auto second = std::async(
        std::launch::async,
        [f = std::move(first)]() mutable { return f.get() * 7; });

    producer.join();
    std::cout << "pipeline result: " << second.get() << '\n';
}
