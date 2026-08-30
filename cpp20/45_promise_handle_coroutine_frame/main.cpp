// Day 45: Promise Type, Coroutine Handle, and Coroutine Frame
#include <coroutine>
#include <iostream>
#include <utility>

struct Task {
    struct promise_type;
    using Handle = std::coroutine_handle<promise_type>;

    struct promise_type {
        int result{};
        Task get_return_object() { return Task{Handle::from_promise(*this)}; }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_value(int value) noexcept { result = value; }
        void unhandled_exception() { std::terminate(); }
    };

    Handle handle{};
    explicit Task(Handle value) : handle{value} {}
    Task(Task&& other) noexcept : handle{std::exchange(other.handle, {})} {}
    Task(const Task&) = delete;
    ~Task() { if (handle) handle.destroy(); }

    int run() { handle.resume(); return handle.promise().result; }
};

Task answer() {
    co_return 42;
}

int main() {
    Task task = answer();
    std::cout << "result = " << task.run() << '\n';
}
