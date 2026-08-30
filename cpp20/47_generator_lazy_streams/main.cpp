// Day 47: Generators and Lazy Data Streams
#include <coroutine>
#include <exception>
#include <iostream>
#include <utility>

struct Generator {
    struct promise_type;
    using Handle = std::coroutine_handle<promise_type>;
    struct promise_type {
        int current{};
        Generator get_return_object() { return Generator{Handle::from_promise(*this)}; }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        std::suspend_always yield_value(int value) noexcept { current = value; return {}; }
        void return_void() noexcept {}
        void unhandled_exception() { std::terminate(); }
    };
    Handle handle{};
    explicit Generator(Handle value) : handle{value} {}
    Generator(Generator&& other) noexcept : handle{std::exchange(other.handle, {})} {}
    Generator(const Generator&) = delete;
    ~Generator() { if (handle) handle.destroy(); }
    bool next() { handle.resume(); return !handle.done(); }
    int value() const { return handle.promise().current; }
};

Generator numbers(int& produced) {
    for (int value = 1; value <= 3; ++value) {
        ++produced;
        co_yield value;
    }
}

int main() {
    int produced = 0;
    auto stream = numbers(produced);
    std::cout << "before = " << produced << '\n';
    stream.next(); std::cout << stream.value() << '\n';
    stream.next(); std::cout << stream.value() << '\n';
    std::cout << "after two = " << produced << '\n';
}
