// Day 49: Coroutine Cancellation, Exceptions, Lifetime, and Allocation
#include <coroutine>
#include <cstddef>
#include <exception>
#include <iostream>
#include <new>
#include <stdexcept>
#include <stop_token>
#include <utility>

int live_frames = 0;

struct Task {
    struct promise_type;
    using Handle = std::coroutine_handle<promise_type>;
    struct promise_type {
        int result{};
        std::exception_ptr error{};
        static void* operator new(std::size_t size) {
            ++live_frames;
            return ::operator new(size);
        }
        static void operator delete(void* pointer, std::size_t size) noexcept {
            --live_frames;
            ::operator delete(pointer, size);
        }
        Task get_return_object() { return Task{Handle::from_promise(*this)}; }
        std::suspend_never initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_value(int value) noexcept { result = value; }
        void unhandled_exception() { error = std::current_exception(); }
    };
    Handle handle{};
    explicit Task(Handle value) : handle{value} {}
    Task(Task&& other) noexcept : handle{std::exchange(other.handle, {})} {}
    Task(const Task&) = delete;
    ~Task() { if (handle) handle.destroy(); }
    int value() const {
        if (handle.promise().error) std::rethrow_exception(handle.promise().error);
        return handle.promise().result;
    }
};

Task work(std::stop_token token, bool fail) {
    if (token.stop_requested()) co_return -1;
    if (fail) throw std::runtime_error("task failed");
    co_return 1;
}

int main() {
    {
        std::stop_source source;
        source.request_stop();
        Task cancelled = work(source.get_token(), false);
        Task failed = work({}, true);
        std::cout << "cancelled result = " << cancelled.value() << '\n';
        try { (void)failed.value(); }
        catch (const std::exception& error) { std::cout << error.what() << '\n'; }
        std::cout << "live frames in scope = " << live_frames << '\n';
    }
    std::cout << "live frames after scope = " << live_frames << '\n';
}
