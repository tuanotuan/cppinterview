// Day 46: Awaitables, Awaiters, and Suspension Lifecycle
#include <coroutine>
#include <iostream>
#include <utility>

struct Task {
    struct promise_type;
    using Handle = std::coroutine_handle<promise_type>;
    struct promise_type {
        Task get_return_object() { return Task{Handle::from_promise(*this)}; }
        std::suspend_never initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_void() noexcept {}
        void unhandled_exception() { std::terminate(); }
    };
    Handle handle{};
    explicit Task(Handle value) : handle{value} {}
    Task(Task&& other) noexcept : handle{std::exchange(other.handle, {})} {}
    Task(const Task&) = delete;
    ~Task() { if (handle) handle.destroy(); }
};

struct TraceAwaiter {
    bool await_ready() const noexcept { std::cout << "await_ready\n"; return true; }
    void await_suspend(std::coroutine_handle<>) const noexcept {
        std::cout << "await_suspend\n";
    }
    int await_resume() const noexcept { std::cout << "await_resume\n"; return 7; }
};

Task demo() {
    int value = co_await TraceAwaiter{};
    std::cout << "value = " << value << '\n';
}

int main() { [[maybe_unused]] Task task = demo(); }
