// Day 39: Cooperative Cancellation and stop_callback
#include <atomic>
#include <iostream>
#include <stop_token>

int main() {
    std::stop_source source;
    std::stop_token token = source.get_token();
    std::atomic<bool> callback_ran{false};

    std::stop_callback callback{token, [&] {
        callback_ran.store(true);
    }};

    bool first_request = source.request_stop();

    std::cout << std::boolalpha;
    std::cout << "first request = " << first_request << '\n';
    std::cout << "stop requested = " << token.stop_requested() << '\n';
    std::cout << "callback ran = " << callback_ran.load() << '\n';
}
