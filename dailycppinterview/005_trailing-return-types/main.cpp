// Daily C++ Interview Q005: What are trailing return types?
// Key: A trailing return type writes the return after the parameter list, as in `auto f(T
// value) -> Result`. It is useful when the return type depends on parameters or when a member
// type is easier to name after entering class scope.
#include <vector>

auto first(const std::vector<int>& values) -> int {
    return values.front();
}

int main() {
    return first({42}) == 42 ? 0 : 1;
}
