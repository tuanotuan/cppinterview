// Daily C++ Interview Q077: What are the differences between a class and a struct?
// Key: `class` and `struct` have the same language capabilities. Their only built-in
// differences are defaults: members and bases are private for `class`, public for `struct`;
// conventionally structs model transparent data while classes protect invariants.
struct PublicData {
    int value;
};

class ProtectedInvariant {
public:
    explicit ProtectedInvariant(int value) : value_(value) {}
    int value() const { return value_; }

private:
    int value_;
};

int main() {
    PublicData data{1};
    ProtectedInvariant object{2};
    return data.value + object.value() == 3 ? 0 : 1;
}
