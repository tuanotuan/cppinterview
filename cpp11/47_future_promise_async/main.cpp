#include <future>
#include <iostream>
#include <thread>

int main() {
    std::promise<int> promise;
    std::future<int> promised = promise.get_future();

    std::thread producer([&promise] {
        promise.set_value(21);
    });

    std::future<int> computed = std::async(
        std::launch::async,
        [] { return 6 * 7; });

    std::cout << "promised=" << promised.get() << '\n';
    std::cout << "computed=" << computed.get() << '\n';
    producer.join();
}
