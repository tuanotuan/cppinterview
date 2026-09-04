// Real-World C++ Interviews Q074: Should you explicitly delete unused/unsupported special
// functions or declare them as private?
// Key: A public `= delete` is the modern choice because it documents the forbidden operation
// and lets overload resolution diagnose it directly. Private declaration without a definition
// is a legacy technique and can defer or obscure the error.
#include <type_traits>

struct NonCopyable {
    NonCopyable() = default;
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};

int main() {
    static_assert(!std::is_copy_constructible_v<NonCopyable>);
}
