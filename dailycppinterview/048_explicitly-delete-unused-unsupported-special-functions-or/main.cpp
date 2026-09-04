// Real-World C++ Interviews Q048: Should you explicitly delete unused/unsupported special
// functions or declare them as private?
// Key: Prefer a public deleted declaration: it states the unsupported operation in the
// interface and gives a direct compile-time diagnostic regardless of access context. A private
// undeclared function is a pre-C++11 technique with less precise behavior and diagnostics.
#include <type_traits>

struct NonCopyable {
    NonCopyable() = default;
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};

int main() {
    static_assert(!std::is_copy_constructible_v<NonCopyable>);
}
