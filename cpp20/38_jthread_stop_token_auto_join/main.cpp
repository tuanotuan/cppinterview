// Day 38: jthread, stop_token, and Automatic Joining
#include <atomic>
#include <iostream>
#include <stop_token>
#include <thread>

int main() {
    std::atomic<int> result{0};

    {
        std::jthread worker{[&](std::stop_token token) {
            if (token.stop_possible()) {
                result.store(42);
            }
        }};
        // No explicit join: the jthread destructor joins at scope exit.
    }

    std::cout << "result = " << result.load() << '\n';
}
