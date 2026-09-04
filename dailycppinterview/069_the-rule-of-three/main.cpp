// Daily C++ Interview Q069: Explain the rule of three
// Key: If a class directly manages a resource and needs a user-defined destructor, it commonly
// also needs a copy constructor and copy assignment operator with coherent ownership semantics.
// This Rule of Three is a warning to define or delete the whole copy contract.
#include <algorithm>
#include <cstddef>

class Buffer {
public:
    explicit Buffer(std::size_t size) : size_(size), data_(new int[size]{}) {}
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& other) : Buffer(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    Buffer& operator=(const Buffer& other) {
        if (this == &other) return *this;
        Buffer copy(other);
        std::swap(size_, copy.size_);
        std::swap(data_, copy.data_);
        return *this;
    }

private:
    std::size_t size_;
    int* data_;
};

int main() {
    Buffer first(3);
    Buffer second = first;
}
