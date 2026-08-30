// Day 48: Asynchronous Tasks with Coroutines
#include <coroutine>
#include <iostream>
#include <stdexcept>
#include <utility>

struct Task {
    struct promise_type;
    using Handle = std::coroutine_handle<promise_type>;
    struct promise_type {
        int result{};
        Task get_return_object() { return Task{Handle::from_promise(*this)}; }
        std::suspend_never initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_value(int value) noexcept { result = value; }
        void unhandled_exception() { std::terminate(); }
    };
    Handle handle{};
    explicit Task(Handle value) : handle{value} {}
    Task(Task&& other) noexcept : handle{std::exchange(other.handle, {})} {}
    Task(const Task&) = delete;
    ~Task() { if (handle) handle.destroy(); }
    void resume() { handle.resume(); }
    bool done() const { return handle.done(); }
    int value() const { if (!done()) throw std::logic_error("not ready"); return handle.promise().result; }
};

Task async_value() {
    co_await std::suspend_always{}; // Educational scheduling boundary.
    co_return 42;
}

int main() {
    Task task = async_value();
    std::cout << "ready before resume = " << std::boolalpha << task.done() << '\n';
    task.resume();
    std::cout << "result = " << task.value() << '\n';
}
