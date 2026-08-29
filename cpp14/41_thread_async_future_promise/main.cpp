#include <future>
#include <iostream>
#include <thread>

int main() {
    std::promise<int> promise;
    std::future<int> promised = promise.get_future();

    std::thread producer([&promise] {
        promise.set_value(21);
    });

    auto asynchronous = std::async(std::launch::async, [] {
        return 42;
    });

    std::cout << "promise: " << promised.get() << "\n";
    std::cout << "async: " << asynchronous.get() << "\n";
    producer.join();
}
